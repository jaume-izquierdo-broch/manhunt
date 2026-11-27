import { Injectable, Logger } from '@nestjs/common';
import {
  type CatchResult,
  LIVE_MATCH_STATUSES,
  type LocationUpdatePayload,
  type MatchSnapshot,
  MatchStatus,
  PlayerStatus,
  type PositionDto,
  Team,
} from '@manhunt/types';
import { type Env, InjectEnv } from '../../config/env.js';
import type { MatchRow } from '../../infrastructure/database/schema.js';
import { LobbyService } from '../lobby/lobby.service.js';
import { MatchReader } from '../matches/match-reader.service.js';
import { MatchesRepository } from '../matches/matches.repository.js';
import { PositionsStore } from '../matches/positions.store.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { checkCatch } from './domain/catch-rules.js';
import { huntWindowOf, nextPingFrom } from './domain/timeline.js';
import { LiveMatchErrors } from './live-match.errors.js';
import { MatchLifecycleService } from './match-lifecycle.service.js';

const isLive = (match: MatchRow) =>
  (LIVE_MATCH_STATUSES as readonly MatchStatus[]).includes(match.status);

/** Player actions during a match (they arrive over WebSocket). */
@Injectable()
export class PlayService {
  private readonly logger = new Logger(PlayService.name);

  constructor(
    @InjectEnv() private readonly env: Env,
    private readonly repo: MatchesRepository,
    private readonly reader: MatchReader,
    private readonly positions: PositionsStore,
    private readonly realtime: RealtimePublisher,
    private readonly lifecycle: MatchLifecycleService,
    private readonly lobby: LobbyService,
  ) {}

  /** Everything a client needs to render the match, on first load or after reconnecting. */
  async snapshot(userId: string, matchId: string): Promise<MatchSnapshot> {
    const { match, player } = await this.reader.getMembershipOrThrow(
      matchId,
      userId,
    );
    const now = new Date();
    const live = isLive(match);

    const teammateIds = (await this.repo.listPlayers(matchId))
      .filter((p) => p.team === player.team && p.userId !== userId)
      .map((p) => p.userId);
    const window = huntWindowOf(match);
    const nextPing =
      live && window
        ? nextPingFrom(now, window, match.pingIntervalSeconds)
        : null;

    return {
      match: await this.reader.toDto(match),
      me: { userId, team: player.team, status: player.status },
      teammates: live ? await this.positions.getMany(matchId, teammateIds) : [],
      lastPing:
        live && player.team === Team.HUNTER
          ? await this.positions.getLastPing(matchId)
          : null,
      nextPingAt: nextPing?.at.toISOString() ?? null,
      serverTime: now.toISOString(),
    };
  }

  /** In the lobby, shows who is ready; in a live match, forwards it to the player's teammates. */
  async updateLocation(
    userId: string,
    matchId: string,
    input: LocationUpdatePayload,
  ): Promise<{ at: string }> {
    const { match, player } = await this.reader.getMembershipOrThrow(
      matchId,
      userId,
    );
    if (match.status === MatchStatus.LOBBY) {
      return this.lobby.reportLocation(match, userId, input);
    }
    if (!isLive(match)) throw LiveMatchErrors.notPlaying();
    if (player.status !== PlayerStatus.ALIVE)
      throw LiveMatchErrors.youAreCaught();

    const position: PositionDto = {
      userId,
      lat: input.lat,
      lng: input.lng,
      accuracy: input.accuracy ?? null,
      at: new Date().toISOString(),
    };
    await this.positions.set(matchId, position);
    this.realtime.toTeammates(
      matchId,
      player.team,
      userId,
      'player:position',
      position,
    );
    return { at: position.at };
  }

  /** A hunter tries to catch a runner. Catching the last free runner wins the match. */
  async attemptCatch(
    hunterId: string,
    matchId: string,
    runnerId: string,
  ): Promise<CatchResult> {
    const { match, player: hunter } = await this.reader.getMembershipOrThrow(
      matchId,
      hunterId,
    );
    if (match.status !== MatchStatus.ACTIVE)
      throw LiveMatchErrors.notHuntingPhase();
    if (hunter.team !== Team.HUNTER) throw LiveMatchErrors.notHunter();

    const runner = await this.repo.getPlayer(matchId, runnerId);
    if (runner?.team !== Team.RUNNER) throw LiveMatchErrors.notRunner();
    if (runner.status !== PlayerStatus.ALIVE) {
      throw LiveMatchErrors.runnerAlreadyCaught();
    }

    const now = new Date();
    const check = checkCatch(
      await this.positions.get(matchId, hunterId),
      await this.positions.get(matchId, runnerId),
      now,
      {
        radiusMeters: this.env.CATCH_RADIUS_METERS,
        maxPositionAgeMs: this.env.POSITION_MAX_AGE_SECONDS * 1000,
      },
    );
    if (!check.ok) {
      throw check.reason === 'TOO_FAR'
        ? LiveMatchErrors.tooFar(
            check.distanceMeters,
            this.env.CATCH_RADIUS_METERS,
          )
        : LiveMatchErrors.positionUnknown();
    }

    // If two hunters catch the same runner at once, only the first one counts.
    if (!(await this.repo.markCaught(matchId, runnerId, hunterId, now))) {
      throw LiveMatchErrors.runnerAlreadyCaught();
    }
    await this.positions.remove(matchId, runnerId);

    const runnersRemaining = await this.repo.countAliveRunners(matchId);
    this.realtime.toMatch(matchId, 'player:caught', {
      matchId,
      runnerId,
      hunterId,
      at: now.toISOString(),
      runnersRemaining,
    });
    this.logger.log(
      `Match ${matchId}: catch at ${Math.round(check.distanceMeters)} m, ${runnersRemaining} runner(s) left`,
    );

    if (runnersRemaining === 0) {
      await this.lifecycle.finish(matchId, Team.HUNTER);
    } else {
      await this.reader.publishUpdate(matchId);
    }
    return { runnerId, distanceMeters: check.distanceMeters, runnersRemaining };
  }
}
