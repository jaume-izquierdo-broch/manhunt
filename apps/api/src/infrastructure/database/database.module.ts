import {
  Global,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { ENV } from '../../config/config.module.js';
import type { Env } from '../../config/env.js';
import { DB, type Database, InjectPgPool, PG_POOL } from './database.tokens.js';
import { runMigrations } from './migrate.js';
import * as schema from './schema.js';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ENV],
      useFactory: async (env: Env) => {
        const pool = new pg.Pool({
          connectionString: env.DATABASE_URL,
          max: env.DATABASE_POOL_MAX,
        });
        pool.on('error', (err) =>
          new Logger('Postgres').error(`Error en el pool: ${err.message}`),
        );
        if (env.RUN_MIGRATIONS) await runMigrations(pool);
        return pool;
      },
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DB, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@InjectPgPool() private readonly pool: pg.Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
