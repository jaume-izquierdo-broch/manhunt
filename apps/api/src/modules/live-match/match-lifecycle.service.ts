import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleInit,
} from '@nestjs/common';
import {
  type CatchClaim,
  LIVE_MATCH_STATUSES,
  type MatchDto,
  MatchStatus,
  type StartMatchInput,
  type PingRevealPayload,
  PlayerStatus,
  Team,
} from '@manhunt/types';
import type { MatchRow } from '../../infrastructure/database/schema.js';
import { assertHostInLobby } from '../lobby/domain/lobby-rules.js';
import { LobbyErrors } from '../lobby/lobby.errors.js';
import { MatchReader } from '../matches/match-reader.service.js';
import { MatchErrors } from '../matches/matches.errors.js';
import { MatchesRepository } from '../matches/matches.repository.js';
import { PositionsStore } from '../matches/positions.store.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import {
  computeTimeline,
  type HuntWindow,
  huntWindowOf,
  nextPingFrom,
  pingSlot,
} from './domain/timeline.js';
import {
  findPlayersNotReady,
  hasBalancedTeams,
  isHostAccurateEnough,
} from './domain/start-rules.js';
import { CatchClaimsStore } from './catch-claims.store.js';
import { LiveMatchErrors } from './live-match.errors.js';
import { MatchTimersQueue, type TimerJob } from './match-timers.queue.js';

/**
 * The match state machine:
 *
 *   LOBBY ──start()──▶ HIDING ──[hiding-end]──▶ ACTIVE ──[match-end]──▶ FINISHED (runners win)
 *                        │                          │  ├─[ping] × N (reveals runners to hunters)
 *                        │                          │  └─catchRunner() when a catch is confirmed
 *                        │                          └──finish(HUNTER) when the last runner is caught
 *                        └── end() by the host, at any point ──▶ FINISHED (nobody wins)
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
    private readonly claims: CatchClaimsStore,
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

  /**
   * LOBBY -> HIDING, requested by the host. The play area is centered on the
   * host, and every other player must be inside it.
   */
  async start(
    matchId: string,
    hostId: string,
    host: StartMatchInput,
  ): Promise<MatchDto> {
    const match = await this.reader.getOrThrow(matchId);
    assertHostInLobby(match, hostId);

    const players = await this.repo.listPlayerViews(matchId);
    if (!hasBalancedTeams(players)) throw LiveMatchErrors.teamsUnbalanced();
    if (!isHostAccurateEnough(host.accuracy)) {
      throw LiveMatchErrors.hostLocationInaccurate();
    }

    const now = new Date();
    const guests = players.filter((p) => p.userId !== hostId);
    const positions = await this.positions.getMany(
      matchId,
      guests.map((p) => p.userId),
    );
    const notReady = findPlayersNotReady(
      guests.map((p) => ({
        userId: p.userId,
        username: p.username,
        position: positions.find((pos) => pos.userId === p.userId) ?? null,
      })),
      host,
      match.radiusMeters,
      now,
    );
    if (notReady.length > 0) throw LiveMatchErrors.playersNotReady(notReady);

    const timeline = computeTimeline(
      now,
      match.hidingSeconds,
      match.durationSeconds,
    );
    const started = await this.repo.markStarted(matchId, host, timeline);
    if (!started) {
      throw MatchErrors.invalidStatus('The match has already started');
    }

    await this.scheduleTimers(started, timeline.startedAt);
    for (const p of players) this.realtime.joinTeam(matchId, p.userId, p.team);

    this.logger.log(`Match ${matchId} started with ${players.length} players`);
    return this.reader.publishUpdate(matchId);
  }

  /** HIDING/ACTIVE -> FINISHED with no winner, when the host calls it off. */
  async end(matchId: string, hostId: string): Promise<MatchDto> {
    const match = await this.reader.getOrThrow(matchId);
    if (match.hostId !== hostId) throw LobbyErrors.notHost();
    if (
      !(LIVE_MATCH_STATUSES as readonly MatchStatus[]).includes(match.status)
    ) {
      throw MatchErrors.invalidStatus('The match is not being played');
    }
    await this.finish(matchId, null);
    return this.reader.toDto(await this.reader.getOrThrow(matchId));
  }

  /** A confirmed catch. Catching the last free runner wins the match. */
  async catchRunner(claim: CatchClaim): Promise<void> {
    const { matchId, runnerId, hunterId } = claim;
    const match = await this.repo.findById(matchId);
    if (match?.status !== MatchStatus.ACTIVE) return;

    const now = new Date();
    // If two catches of the same runner are confirmed at once, only the first counts.
    if (!(await this.repo.markCaught(matchId, runnerId, hunterId, now))) return;
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
      `Match ${matchId}: catch confirmed, ${runnersRemaining} runner(s) left`,
    );

    if (runnersRemaining === 0) {
      await this.finish(matchId, Team.HUNTER);
    } else {
      await this.reader.publishUpdate(matchId);
    }
  }

  /** HIDING/ACTIVE -> FINISHED. `null`: nobody wins (the host ended it). Only the first call has any effect. */
  async finish(matchId: string, winnerTeam: Team | null): Promise<void> {
    const endedAt = new Date();
    const finished = await this.repo.markFinished(matchId, winnerTeam, endedAt);
    if (!finished) return;

    this.logger.log(
      `Match ${matchId} finished: ${winnerTeam ? `${winnerTeam} team wins` : 'ended by the host'}`,
    );
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
        // The first ping is due with the end of hiding: it may run before that job.
        await this.beginHunt(job.matchId);
        return this.sendPing(job.matchId, job.seq);
      case 'match-end':
        return this.finish(job.matchId, Team.RUNNER);
      case 'catch-confirm':
        return this.confirmUnanswered(job);
    }
  }

  /** The runner didn't answer in time: the catch counts. */
  private async confirmUnanswered(job: TimerJob): Promise<void> {
    if (!job.runnerId) return;
    const claim = await this.claims.get(job.matchId, job.runnerId);
    // Only the claim this timer was set for (not a later one on the same runner).
    if (!claim || Date.parse(claim.expiresAt) !== job.seq) return;
    const taken = await this.claims.take(job.matchId, job.runnerId);
    if (taken) await this.catchRunner(taken);
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
    const nextPing = nextPingFrom(now, window, match.pingIntervalSeconds);
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
