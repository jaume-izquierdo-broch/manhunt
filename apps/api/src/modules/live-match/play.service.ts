import { Injectable } from '@nestjs/common';
import {
  CATCH_CONFIRM_MS,
  type CatchClaim,
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
import { CatchClaimsStore } from './catch-claims.store.js';
import { checkCatch } from './domain/catch-rules.js';
import { huntWindowOf, nextPingFrom } from './domain/timeline.js';
import { LiveMatchErrors } from './live-match.errors.js';
import { MatchLifecycleService } from './match-lifecycle.service.js';
import { MatchTimersQueue } from './match-timers.queue.js';

const isLive = (match: MatchRow) =>
  (LIVE_MATCH_STATUSES as readonly MatchStatus[]).includes(match.status);

/** Player actions during a match (they arrive over WebSocket). */
@Injectable()
export class PlayService {
  constructor(
    @InjectEnv() private readonly env: Env,
    private readonly repo: MatchesRepository,
    private readonly reader: MatchReader,
    private readonly positions: PositionsStore,
    private readonly realtime: RealtimePublisher,
    private readonly lifecycle: MatchLifecycleService,
    private readonly lobby: LobbyService,
    private readonly claims: CatchClaimsStore,
    private readonly timers: MatchTimersQueue,
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
      pendingCatch:
        live && player.team === Team.RUNNER
          ? await this.claims.get(matchId, userId)
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

  /**
   * A hunter says they caught a runner. If they are close enough, the runner
   * is asked to confirm; it counts if they do, or if they don't answer in time.
   */
  async attemptCatch(
    hunterId: string,
    matchId: string,
    runnerId: string,
  ): Promise<CatchClaim> {
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

    const expiresAt = new Date(now.getTime() + CATCH_CONFIRM_MS);
    const claim: CatchClaim = {
      matchId,
      runnerId,
      hunterId,
      expiresAt: expiresAt.toISOString(),
    };
    if (!(await this.claims.create(claim)))
      throw LiveMatchErrors.catchPending();
    await this.timers.schedule(confirmTimer(claim), expiresAt);
    this.realtime.toUser(runnerId, 'catch:claimed', claim);
    return claim;
  }

  /** The runner answers the catch waiting for them. */
  async answerCatch(
    runnerId: string,
    matchId: string,
    caught: boolean,
  ): Promise<null> {
    await this.reader.getMembershipOrThrow(matchId, runnerId);
    const claim = await this.claims.take(matchId, runnerId);
    if (!claim) throw LiveMatchErrors.noCatchToAnswer();
    await this.timers.cancel(confirmTimer(claim));

    if (caught) {
      await this.lifecycle.catchRunner(claim);
    } else {
      this.realtime.toUser(claim.hunterId, 'catch:rejected', {
        matchId,
        runnerId,
      });
    }
    return null;
  }
}

/** The timer that confirms the catch if the runner doesn't answer. */
const confirmTimer = (claim: CatchClaim) => ({
  matchId: claim.matchId,
  kind: 'catch-confirm' as const,
  runnerId: claim.runnerId,
  seq: Date.parse(claim.expiresAt),
});
