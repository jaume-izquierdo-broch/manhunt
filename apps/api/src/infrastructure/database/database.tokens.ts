import { Inject } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

export const DB = Symbol('DB');
export const PG_POOL = Symbol('PG_POOL');

/** Drizzle client: `constructor(@InjectDb() db: Database)`. Only repositories use it. */
export const InjectDb = () => Inject(DB);

/** Raw `pg` pool, for the health check and migrations. */
export const InjectPgPool = () => Inject(PG_POOL);
