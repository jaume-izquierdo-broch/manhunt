import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type pg from 'pg';
import { InjectPgPool } from '../../infrastructure/database/database.tokens.js';
import { InjectRedis } from '../../infrastructure/redis/redis.tokens.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(
    @InjectPgPool() private readonly pool: pg.Pool,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /** Liveness: the process is up. */
  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /** Readiness: Postgres and Redis respond. Used by Docker and load balancers. */
  @Public()
  @Get()
  async ready() {
    const [db, redis] = await Promise.allSettled([
      this.pool.query('select 1'),
      this.redis.ping(),
    ]);
    const checks = {
      database: db.status === 'fulfilled' ? 'up' : 'down',
      redis: redis.status === 'fulfilled' ? 'up' : 'down',
    };
    if (checks.database === 'down' || checks.redis === 'down') {
      throw new ServiceUnavailableException({ status: 'error', checks });
    }
    return { status: 'ok', checks };
  }
}
