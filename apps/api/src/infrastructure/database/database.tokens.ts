import { Inject } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

export const DB = Symbol('DB');
export const PG_POOL = Symbol('PG_POOL');

/** Cliente Drizzle: `constructor(@InjectDb() db: Database)`. Solo lo usan los repositorios. */
export const InjectDb = () => Inject(DB);
/** Pool de `pg` crudo (health check, migraciones). */
export const InjectPgPool = () => Inject(PG_POOL);
