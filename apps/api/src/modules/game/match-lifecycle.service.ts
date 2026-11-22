import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleInit,
} from '@nestjs/common';
import {
  type MatchDto,
  MatchStatus,
  type PingRevealPayload,
  PlayerStatus,
  Team,
} from '@manhunt/types';
import type { MatchRow } from '../../infrastructure/database/schema.js';
import {
  assertHostInLobby,
  hasBalancedTeams,
} from '../matches/domain/lobby-rules.js';
import { MatchReader } from '../matches/match-reader.service.js';
import { MatchErrors } from '../matches/matches.errors.js';
import { MatchesRepository } from '../matches/matches.repository.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { computeTimeline, nextPingAfter, pingSlot } from './domain/timeline.js';
import { MatchTimersQueue, type TimerJob } from './match-timers.queue.js';
import { PositionsStore } from './positions.store.js';

/**
 * Máquina de estados de la partida:
 *
 *   WAITING ──start()──▶ HIDING ──[hiding-end]──▶ ACTIVE ──[match-end]──▶ FINISHED (ganan RUNNER)
 *                                                   │  └─[ping]×N (revela escapadores)
 *                                                   └──finish(HUNTER) al capturar al último
 *
 * Todas las transiciones son idempotentes (UPDATE condicional en el repositorio),
 * así que un temporizador repetido o tardío no hace daño.
 */
@Injectable()
export class MatchLifecycleService
  implements OnModuleInit, OnApplicationBootstrap
{
  private readonly logger = new Logger(MatchLifecycleService.name);

  constructor(
    private readonly repo: MatchesRepository,
    private readonly reader: MatchReader,
    private readonly timers: MatchTimersQueue,
    private readonly positions: PositionsStore,
    private readonly realtime: RealtimePublisher,
  ) {}

  onModuleInit() {
    this.timers.setHandler((job) => this.onTimer(job));
  }

  /** Tras un reinicio o despliegue, vuelve a programar las partidas en curso. */
  async onApplicationBootstrap() {
    const live = await this.repo.findLive();
    for (const match of live) {
      try {
        await this.resume(match);
      } catch (error) {
        this.logger.error(`No se pudo reanudar ${match.id}: ${String(error)}`);
      }
    }
    if (live.length)
      this.logger.log(`Reanudadas ${live.length} partidas en curso`);
  }

  // --- Transiciones --------------------------------------------------------

  /** WAITING -> HIDING. Lo pide el anfitrión. */
  async start(matchId: string, hostId: string): Promise<MatchDto> {
    const match = await this.reader.getOrThrow(matchId);
    assertHostInLobby(match, hostId);

    const players = await this.repo.listPlayers(matchId);
    if (!hasBalancedTeams(players)) throw MatchErrors.teamsUnbalanced();

    const timeline = computeTimeline(
      new Date(),
      match.hidingSeconds,
      match.durationSeconds,
    );
    const started = await this.repo.markStarted(matchId, timeline);
    if (!started) throw MatchErrors.invalidStatus('La partida ya ha empezado');

    await this.scheduleTimers(started, timeline.startedAt);
    for (const p of players) this.realtime.joinTeam(matchId, p.userId, p.team);

    this.logger.log(
      `Partida ${matchId} empezada (${players.length} jugadores)`,
    );
    return (await this.reader.publishUpdate(matchId))!;
  }

  /** HIDING/ACTIVE -> FINISHED. Solo la primera llamada tiene efecto. */
  async finish(matchId: string, winnerTeam: Team): Promise<void> {
    const endedAt = new Date();
    const finished = await this.repo.markFinished(matchId, winnerTeam, endedAt);
    if (!finished) return;

    this.logger.log(`Partida ${matchId} terminada: ganan ${winnerTeam}`);
    await this.timers.cancel({ matchId, kind: 'match-end', seq: 0 });
    await this.positions.clear(matchId);

    this.realtime.toMatch(matchId, 'match:finished', {
      matchId,
      winnerTeam,
      endedAt: endedAt.toISOString(),
    });
    await this.reader.publishUpdate(matchId);
  }

  // --- Temporizadores ------------------------------------------------------

  private async onTimer(job: TimerJob): Promise<void> {
    switch (job.kind) {
      case 'hiding-end':
        return this.beginHunt(job.matchId);
      case 'ping':
        // Por si el ping llega antes de procesar el fin del escondite.
        await this.beginHunt(job.matchId);
        return this.sendPing(job.matchId, job.seq);
      case 'match-end':
        return this.finish(job.matchId, Team.RUNNER);
    }
  }

  /** HIDING -> ACTIVE. */
  private async beginHunt(matchId: string): Promise<void> {
    const activated = await this.repo.markActive(matchId, new Date());
    if (!activated) return;
    this.logger.log(`Partida ${matchId}: empieza la caza`);
    await this.reader.publishUpdate(matchId);
  }

  /** Revela a los cazadores la posición de los escapadores vivos y programa el siguiente ping. */
  private async sendPing(matchId: string, seq: number): Promise<void> {
    const match = await this.repo.findById(matchId);
    if (match?.status !== MatchStatus.ACTIVE) return;

    const aliveRunnerIds = (await this.repo.listPlayers(matchId))
      .filter((p) => p.team === Team.RUNNER && p.status === PlayerStatus.ALIVE)
      .map((p) => p.userId);
    const next = pingSlot(
      timelineOf(match),
      match.pingIntervalSeconds,
      seq + 1,
    );

    const ping: PingRevealPayload = {
      matchId,
      at: new Date().toISOString(),
      runners: await this.positions.getMany(matchId, aliveRunnerIds),
      nextPingAt: next?.at.toISOString() ?? null,
    };
    await this.positions.setLastPing(matchId, ping);

    this.realtime.toTeam(matchId, Team.HUNTER, 'ping:reveal', ping);
    this.realtime.toTeam(matchId, Team.RUNNER, 'ping:notice', {
      matchId,
      at: ping.at,
      nextPingAt: ping.nextPingAt,
    });

    if (next)
      await this.timers.schedule(
        { matchId, kind: 'ping', seq: next.seq },
        next.at,
      );
  }

  // --- Programación --------------------------------------------------------

  private async resume(match: MatchRow): Promise<void> {
    const now = new Date();
    if (match.endsAt && match.endsAt <= now) {
      await this.finish(match.id, Team.RUNNER);
      return;
    }
    await this.scheduleTimers(match, now);
  }

  /** Programa fin de escondite, fin de partida y el siguiente ping. Idempotente. */
  private async scheduleTimers(match: MatchRow, now: Date): Promise<void> {
    const timeline = timelineOf(match);
    const nextPing = nextPingAfter(now, timeline, match.pingIntervalSeconds);
    await Promise.all([
      this.timers.schedule(
        { matchId: match.id, kind: 'hiding-end', seq: 0 },
        timeline.hidingEndsAt,
      ),
      this.timers.schedule(
        { matchId: match.id, kind: 'match-end', seq: 0 },
        timeline.endsAt,
      ),
      nextPing &&
        this.timers.schedule(
          { matchId: match.id, kind: 'ping', seq: nextPing.seq },
          nextPing.at,
        ),
    ]);
  }
}

/** Horas de una partida ya empezada. */
function timelineOf(match: MatchRow) {
  if (!match.hidingEndsAt || !match.endsAt) {
    throw new Error(
      `La partida ${match.id} no tiene horario: ¿no ha empezado?`,
    );
  }
  return { hidingEndsAt: match.hidingEndsAt, endsAt: match.endsAt };
}
