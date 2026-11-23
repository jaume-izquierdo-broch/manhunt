import { Injectable } from '@nestjs/common';
import {
  LIVE_MATCH_STATUSES,
  MatchStatus,
  OPEN_MATCH_STATUSES,
  PlayerStatus,
  Team,
} from '@manhunt/types';
import { and, asc, count, eq, inArray, lte } from 'drizzle-orm';
import {
  type Database,
  InjectDb,
} from '../../infrastructure/database/database.tokens.js';
import { isUniqueViolation } from '../../infrastructure/database/pg-errors.js';
import {
  type MatchPlayerRow,
  type MatchRow,
  matches,
  matchPlayers,
  type NewMatchRow,
  users,
} from '../../infrastructure/database/schema.js';

/** A player row plus the username, as needed by the DTO. */
export type PlayerView = Pick<
  MatchPlayerRow,
  'userId' | 'team' | 'status' | 'caughtBy' | 'caughtAt'
> & { username: string };

export interface MatchTimeline {
  startedAt: Date;
  hidingEndsAt: Date;
  endsAt: Date;
}

const byPlayer = (matchId: string, userId: string) =>
  and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.userId, userId));

/**
 * All SQL for matches and players; services never use Drizzle directly.
 *
 * Status changes are conditional UPDATEs (`WHERE status = ...`) that return
 * `null` / `false` when nothing changed. That way two concurrent requests or
 * timers can never leave a match in an inconsistent state.
 */
@Injectable()
export class MatchesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  // --- Matches: reads ------------------------------------------------------

  findById(matchId: string): Promise<MatchRow | undefined> {
    return this.db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  }

  findByJoinCode(joinCode: string): Promise<MatchRow | undefined> {
    return this.db.query.matches.findFirst({
      where: eq(matches.joinCode, joinCode),
    });
  }

  /** The unfinished match (WAITING/HIDING/ACTIVE) the user belongs to. */
  async findOpenForUser(userId: string): Promise<MatchRow | undefined> {
    const [row] = await this.db
      .select({ match: matches })
      .from(matchPlayers)
      .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
      .where(
        and(
          eq(matchPlayers.userId, userId),
          inArray(matches.status, [...OPEN_MATCH_STATUSES]),
        ),
      )
      .limit(1);
    return row?.match;
  }

  /** Matches being played (HIDING/ACTIVE), to reschedule their timers on startup. */
  findLive(): Promise<MatchRow[]> {
    return this.db.query.matches.findMany({
      where: inArray(matches.status, [...LIVE_MATCH_STATUSES]),
    });
  }

  // --- Matches: writes -----------------------------------------------------

  /**
   * Creates the match and adds the host as a hunter, in one transaction.
   * Returns `null` if the join code is already taken (the caller retries).
   */
  async createWithHost(
    values: Omit<NewMatchRow, 'hostId'>,
    hostId: string,
  ): Promise<MatchRow | null> {
    try {
      return await this.db.transaction(async (tx) => {
        const [match] = await tx
          .insert(matches)
          .values({ ...values, hostId })
          .returning();
        await tx
          .insert(matchPlayers)
          .values({ matchId: match!.id, userId: hostId, team: Team.HUNTER });
        return match!;
      });
    } catch (error) {
      if (isUniqueViolation(error, 'matches_join_code_uq')) return null;
      throw error;
    }
  }

  async delete(matchId: string): Promise<void> {
    await this.db.delete(matches).where(eq(matches.id, matchId));
  }

  /** WAITING -> HIDING, storing the computed timeline. */
  async markStarted(
    matchId: string,
    timeline: MatchTimeline,
  ): Promise<MatchRow | null> {
    const [row] = await this.db
      .update(matches)
      .set({ status: MatchStatus.HIDING, ...timeline })
      .where(
        and(eq(matches.id, matchId), eq(matches.status, MatchStatus.WAITING)),
      )
      .returning();
    return row ?? null;
  }

  /** HIDING -> ACTIVE, only once `hidingEndsAt` has passed. */
  async markActive(matchId: string, now: Date): Promise<MatchRow | null> {
    const [row] = await this.db
      .update(matches)
      .set({ status: MatchStatus.ACTIVE })
      .where(
        and(
          eq(matches.id, matchId),
          eq(matches.status, MatchStatus.HIDING),
          lte(matches.hidingEndsAt, now),
        ),
      )
      .returning();
    return row ?? null;
  }

  /** HIDING/ACTIVE -> FINISHED, with the winning team. */
  async markFinished(
    matchId: string,
    winnerTeam: Team,
    endedAt: Date,
  ): Promise<MatchRow | null> {
    const [row] = await this.db
      .update(matches)
      .set({ status: MatchStatus.FINISHED, winnerTeam, endedAt })
      .where(
        and(
          eq(matches.id, matchId),
          inArray(matches.status, [...LIVE_MATCH_STATUSES]),
        ),
      )
      .returning();
    return row ?? null;
  }

  // --- Players -------------------------------------------------------------

  async getPlayer(
    matchId: string,
    userId: string,
  ): Promise<MatchPlayerRow | undefined> {
    return this.db.query.matchPlayers.findFirst({
      where: byPlayer(matchId, userId),
    });
  }

  listPlayers(matchId: string): Promise<MatchPlayerRow[]> {
    return this.db.query.matchPlayers.findMany({
      where: eq(matchPlayers.matchId, matchId),
    });
  }

  /** Players with their usernames, in joining order. */
  listPlayerViews(matchId: string): Promise<PlayerView[]> {
    return this.db
      .select({
        userId: matchPlayers.userId,
        username: users.username,
        team: matchPlayers.team,
        status: matchPlayers.status,
        caughtBy: matchPlayers.caughtBy,
        caughtAt: matchPlayers.caughtAt,
      })
      .from(matchPlayers)
      .innerJoin(users, eq(users.id, matchPlayers.userId))
      .where(eq(matchPlayers.matchId, matchId))
      .orderBy(asc(matchPlayers.joinedAt));
  }

  async countPlayers(matchId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, matchId));
    return row?.total ?? 0;
  }

  async countAliveRunners(matchId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(matchPlayers)
      .where(
        and(
          eq(matchPlayers.matchId, matchId),
          eq(matchPlayers.team, Team.RUNNER),
          eq(matchPlayers.status, PlayerStatus.ALIVE),
        ),
      );
    return row?.total ?? 0;
  }

  async addPlayer(matchId: string, userId: string, team: Team): Promise<void> {
    await this.db
      .insert(matchPlayers)
      .values({ matchId, userId, team })
      .onConflictDoNothing();
  }

  async removePlayer(matchId: string, userId: string): Promise<void> {
    await this.db.delete(matchPlayers).where(byPlayer(matchId, userId));
  }

  /** Returns `false` if the player is not in the match. */
  async setPlayerTeam(
    matchId: string,
    userId: string,
    team: Team,
  ): Promise<boolean> {
    const updated = await this.db
      .update(matchPlayers)
      .set({ team })
      .where(byPlayer(matchId, userId))
      .returning({ userId: matchPlayers.userId });
    return updated.length > 0;
  }

  /** ALIVE -> CAUGHT. Returns `false` if already caught (e.g. two hunters at once). */
  async markCaught(
    matchId: string,
    runnerId: string,
    hunterId: string,
    at: Date,
  ): Promise<boolean> {
    const updated = await this.db
      .update(matchPlayers)
      .set({ status: PlayerStatus.CAUGHT, caughtBy: hunterId, caughtAt: at })
      .where(
        and(
          byPlayer(matchId, runnerId),
          eq(matchPlayers.status, PlayerStatus.ALIVE),
        ),
      )
      .returning({ userId: matchPlayers.userId });
    return updated.length > 0;
  }
}
