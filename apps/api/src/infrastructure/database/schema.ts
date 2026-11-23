// Esquema de la base de datos (Drizzle). Tras cambiarlo:
//   pnpm --filter @manhunt/api db:generate   -> crea la migración SQL en ./drizzle
// Las migraciones se aplican solas al arrancar la API (RUN_MIGRATIONS=true).
import type { MatchStatus, PlayerStatus, Team } from '@manhunt/types';
import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date' });

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 50 }).notNull(),
    // Nullable solo por las cuentas creadas antes de pedir email; el registro lo exige.
    // Se guarda ya en minúsculas (lo normaliza el esquema de validación).
    email: varchar('email', { length: 254 }),
    passwordHash: text('password_hash').notNull(),
    // Consentimiento: cuándo y qué versión de la política de privacidad aceptó.
    termsAcceptedAt: timestamptz('terms_accepted_at'),
    termsVersion: varchar('terms_version', { length: 20 }),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_username_lower_uq').on(sql`lower(${t.username})`),
    uniqueIndex('users_email_lower_uq').on(sql`lower(${t.email})`),
  ],
);

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    hostId: uuid('host_id')
      .notNull()
      .references(() => users.id),
    joinCode: varchar('join_code', { length: 8 }).notNull(),
    status: varchar('status', { length: 20 })
      .$type<MatchStatus>()
      .notNull()
      .default('WAITING'),

    // Zona de juego (círculo). Más adelante se puede migrar a PostGIS.
    centerLat: doublePrecision('center_lat').notNull(),
    centerLng: doublePrecision('center_lng').notNull(),
    radiusMeters: integer('radius_meters').notNull(),

    hidingSeconds: integer('hiding_seconds').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    pingIntervalSeconds: integer('ping_interval_seconds').notNull(),

    winnerTeam: varchar('winner_team', { length: 20 }).$type<Team>(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    startedAt: timestamptz('started_at'),
    hidingEndsAt: timestamptz('hiding_ends_at'),
    endsAt: timestamptz('ends_at'),
    endedAt: timestamptz('ended_at'),
  },
  (t) => [
    uniqueIndex('matches_join_code_uq').on(t.joinCode),
    index('matches_status_idx').on(t.status),
    check(
      'matches_status_ck',
      sql`${t.status} in ('WAITING','HIDING','ACTIVE','FINISHED')`,
    ),
    check(
      'matches_winner_ck',
      sql`${t.winnerTeam} is null or ${t.winnerTeam} in ('HUNTER','RUNNER')`,
    ),
  ],
);

export const matchPlayers = pgTable(
  'match_players',
  {
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    team: varchar('team', { length: 15 }).$type<Team>().notNull(),
    status: varchar('status', { length: 15 })
      .$type<PlayerStatus>()
      .notNull()
      .default('ALIVE'),
    caughtBy: uuid('caught_by').references(() => users.id),
    caughtAt: timestamptz('caught_at'),
    joinedAt: timestamptz('joined_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.userId] }),
    index('match_players_user_idx').on(t.userId),
    check('match_players_team_ck', sql`${t.team} in ('HUNTER','RUNNER')`),
    check('match_players_status_ck', sql`${t.status} in ('ALIVE','CAUGHT')`),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
export type NewMatchRow = typeof matches.$inferInsert;
export type MatchPlayerRow = typeof matchPlayers.$inferSelect;
