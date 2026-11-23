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
import {
  computeTimeline,
  type HuntWindow,
  huntWindowOf,
  nextPingAfter,
  pingSlot,
} from './domain/timeline.js';
import { MatchTimersQueue, type TimerJob } from './match-timers.queue.js';
import { PositionsStore } from './positions.store.js';

/**
 * The match state machine:
 *
 *   WAITING ──start()──▶ HIDING ──[hiding-end]──▶ ACTIVE ──[match-end]──▶ FINISHED (runners win)
 *                                                   │  └─[ping] × N (reveals runners to hunters)
 *                                                   └──finish(HUNTER) when the last runner is caught
 *
 * Every transition is idempotent (a conditional UPDATE in the repository), so a
 * duplicated or late timer is harmless.
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

  /** After a restart or a deploy, reschedule the timers of matches in progress. */
  async onApplicationBootstrap() {
    const live = await this.repo.findLive();
    for (const match of live) {
      try {
        await this.resume(match);
      } catch (error) {
        this.logger.error(
          `Could not resume match ${match.id}: ${String(error)}`,
        );
      }
    }
    if (live.length) {
      this.logger.log(`Resumed ${live.length} match(es) in progress`);
    }
  }

  // --- Transitions ---------------------------------------------------------

  /** WAITING -> HIDING, requested by the host. */
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
    if (!started) {
      throw MatchErrors.invalidStatus('The match has already started');
    }

    await this.scheduleTimers(started, timeline.startedAt);
    for (const p of players) this.realtime.joinTeam(matchId, p.userId, p.team);

    this.logger.log(`Match ${matchId} started with ${players.length} players`);
    return this.reader.publishUpdate(matchId);
  }

  /** HIDING/ACTIVE -> FINISHED. Only the first call has any effect. */
  async finish(matchId: string, winnerTeam: Team): Promise<void> {
    const endedAt = new Date();
    const finished = await this.repo.markFinished(matchId, winnerTeam, endedAt);
    if (!finished) return;

    this.logger.log(`Match ${matchId} finished: ${winnerTeam} team wins`);
    await this.timers.cancel({ matchId, kind: 'match-end', seq: 0 });
    await this.positions.clear(matchId);

    this.realtime.toMatch(matchId, 'match:finished', {
      matchId,
      winnerTeam,
      endedAt: endedAt.toISOString(),
    });
    await this.reader.publishUpdate(matchId);
  }

  // --- Timers --------------------------------------------------------------

  private async onTimer(job: TimerJob): Promise<void> {
    switch (job.kind) {
      case 'hiding-end':
        return this.beginHunt(job.matchId);
      case 'ping':
        // In case the ping fires before the hiding-end job has been processed.
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
    this.logger.log(`Match ${matchId}: the hunt begins`);
    await this.reader.publishUpdate(matchId);
  }

  /** Reveals the free runners' positions to the hunters, then schedules the next ping. */
  private async sendPing(matchId: string, seq: number): Promise<void> {
    const match = await this.repo.findById(matchId);
    if (match?.status !== MatchStatus.ACTIVE) return;

    const aliveRunnerIds = (await this.repo.listPlayers(matchId))
      .filter((p) => p.team === Team.RUNNER && p.status === PlayerStatus.ALIVE)
      .map((p) => p.userId);
    const next = pingSlot(
      requireHuntWindow(match),
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

    if (next) {
      await this.timers.schedule(
        { matchId, kind: 'ping', seq: next.seq },
        next.at,
      );
    }
  }

  // --- Scheduling ----------------------------------------------------------

  private async resume(match: MatchRow): Promise<void> {
    const now = new Date();
    if (match.endsAt && match.endsAt <= now) {
      await this.finish(match.id, Team.RUNNER);
      return;
    }
    await this.scheduleTimers(match, now);
  }

  /** Schedules the end of hiding, the end of the match and the next ping. Idempotent. */
  private async scheduleTimers(match: MatchRow, now: Date): Promise<void> {
    const window = requireHuntWindow(match);
    const nextPing = nextPingAfter(now, window, match.pingIntervalSeconds);
    await Promise.all([
      this.timers.schedule(
        { matchId: match.id, kind: 'hiding-end', seq: 0 },
        window.hidingEndsAt,
      ),
      this.timers.schedule(
        { matchId: match.id, kind: 'match-end', seq: 0 },
        window.endsAt,
      ),
      nextPing &&
        this.timers.schedule(
          { matchId: match.id, kind: 'ping', seq: nextPing.seq },
          nextPing.at,
        ),
    ]);
  }
}

function requireHuntWindow(match: MatchRow): HuntWindow {
  const window = huntWindowOf(match);
  if (!window) throw new Error(`Match ${match.id} has not started yet`);
  return window;
}
