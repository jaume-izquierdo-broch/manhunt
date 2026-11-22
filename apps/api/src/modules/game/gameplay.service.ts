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
import { InjectEnv } from '../../config/config.module.js';
import type { Env } from '../../config/env.js';
import type { MatchRow } from '../../infrastructure/database/schema.js';
import { MatchReader } from '../matches/match-reader.service.js';
import { MatchesRepository } from '../matches/matches.repository.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { checkCatch } from './domain/catch-rules.js';
import { nextPingAfter } from './domain/timeline.js';
import { GameErrors } from './game.errors.js';
import { MatchLifecycleService } from './match-lifecycle.service.js';
import { PositionsStore } from './positions.store.js';

const isLive = (match: MatchRow) =>
  (LIVE_MATCH_STATUSES as readonly MatchStatus[]).includes(match.status);

/** Acciones de los jugadores durante la partida (llegan por WebSocket). */
@Injectable()
export class GameplayService {
  private readonly logger = new Logger(GameplayService.name);

  constructor(
    @InjectEnv() private readonly env: Env,
    private readonly repo: MatchesRepository,
    private readonly reader: MatchReader,
    private readonly positions: PositionsStore,
    private readonly realtime: RealtimePublisher,
    private readonly lifecycle: MatchLifecycleService,
  ) {}

  /** Todo lo necesario para pintar la pantalla de juego (también al reconectar). */
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
    const nextPing =
      live && match.hidingEndsAt && match.endsAt
        ? nextPingAfter(
            now,
            { hidingEndsAt: match.hidingEndsAt, endsAt: match.endsAt },
            match.pingIntervalSeconds,
          )
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

  /** Guarda la posición y la reenvía a los compañeros de equipo. */
  async updateLocation(
    userId: string,
    matchId: string,
    input: LocationUpdatePayload,
  ): Promise<{ at: string }> {
    const { match, player } = await this.reader.getMembershipOrThrow(
      matchId,
      userId,
    );
    if (!isLive(match)) throw GameErrors.notPlaying();
    if (player.status !== PlayerStatus.ALIVE) throw GameErrors.youAreCaught();

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

  /** Un cazador intenta capturar a un escapador. Si era el último, ganan los cazadores. */
  async attemptCatch(
    hunterId: string,
    matchId: string,
    runnerId: string,
  ): Promise<CatchResult> {
    const { match, player: hunter } = await this.reader.getMembershipOrThrow(
      matchId,
      hunterId,
    );
    if (match.status !== MatchStatus.ACTIVE) throw GameErrors.notHuntingPhase();
    if (hunter.team !== Team.HUNTER) throw GameErrors.notHunter();

    const runner = await this.repo.getPlayer(matchId, runnerId);
    if (runner?.team !== Team.RUNNER) throw GameErrors.notRunner();
    if (runner.status !== PlayerStatus.ALIVE)
      throw GameErrors.runnerAlreadyCaught();

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
        ? GameErrors.tooFar(check.distanceMeters, this.env.CATCH_RADIUS_METERS)
        : GameErrors.positionUnknown();
    }

    // Si dos cazadores capturan a la vez, solo cuenta el primero.
    if (!(await this.repo.markCaught(matchId, runnerId, hunterId, now))) {
      throw GameErrors.runnerAlreadyCaught();
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
      `Partida ${matchId}: captura a ${Math.round(check.distanceMeters)} m, quedan ${runnersRemaining}`,
    );

    if (runnersRemaining === 0) {
      await this.lifecycle.finish(matchId, Team.HUNTER);
    } else {
      await this.reader.publishUpdate(matchId);
    }
    return { runnerId, distanceMeters: check.distanceMeters, runnersRemaining };
  }
}
