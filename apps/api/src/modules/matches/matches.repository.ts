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

/** Jugador con su nombre de usuario (para construir el DTO). */
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
 * Todo el SQL de partidas y jugadores. Los servicios no usan Drizzle directamente.
 *
 * Los cambios de estado son UPDATE condicionales (`WHERE status = ...`) que
 * devuelven `null` si no se aplicaron: así dos peticiones o temporizadores
 * simultáneos nunca dejan la partida en un estado incoherente.
 */
@Injectable()
export class MatchesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  // --- Partidas: lectura ---------------------------------------------------

  findById(matchId: string): Promise<MatchRow | undefined> {
    return this.db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  }

  findByJoinCode(joinCode: string): Promise<MatchRow | undefined> {
    return this.db.query.matches.findFirst({
      where: eq(matches.joinCode, joinCode),
    });
  }

  /** Partida no terminada (WAITING/HIDING/ACTIVE) en la que está el usuario. */
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

  /** Partidas en juego (HIDING/ACTIVE): para re-programar temporizadores al arrancar. */
  findLive(): Promise<MatchRow[]> {
    return this.db.query.matches.findMany({
      where: inArray(matches.status, [...LIVE_MATCH_STATUSES]),
    });
  }

  // --- Partidas: escritura -------------------------------------------------

  /**
   * Crea la partida y mete al anfitrión como cazador, en una transacción.
   * Devuelve `null` si el código de unión ya existía (el llamador reintenta).
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

  /** WAITING -> HIDING con las horas calculadas. */
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

  /** HIDING -> ACTIVE, solo si ya pasó `hidingEndsAt`. */
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

  /** HIDING/ACTIVE -> FINISHED con el equipo ganador. */
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

  // --- Jugadores -----------------------------------------------------------

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

  /** Jugadores con nombre, en orden de llegada. */
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

  /** Devuelve `false` si el jugador no está en la partida. */
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

  /** ALIVE -> CAUGHT. Devuelve `false` si ya estaba capturado (captura simultánea). */
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
