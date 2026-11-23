import { Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

/** `apps/api/drizzle` (same relative path from both src/ and dist/). */
export const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../../../drizzle', import.meta.url),
);

/** Arbitrary advisory-lock key, so two replicas never migrate at the same time. */
const MIGRATION_LOCK_KEY = 4_242_001;

export async function runMigrations(pool: pg.Pool): Promise<void> {
  const logger = new Logger('Migrations');
  const lockClient = await pool.connect();
  try {
    await lockClient.query('select pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
    logger.log('Migrations applied');
  } finally {
    await lockClient
      .query('select pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY])
      .catch(() => undefined);
    lockClient.release();
  }
}
