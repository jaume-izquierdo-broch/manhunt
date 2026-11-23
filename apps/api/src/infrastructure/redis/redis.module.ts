import { Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis, type RedisOptions } from 'ioredis';
import { ENV, type Env } from '../../config/env.js';
import { InjectRedis, REDIS, REDIS_OPTIONS } from './redis.tokens.js';

export function redisOptionsFromEnv(env: Env): RedisOptions {
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    // Required by BullMQ; also fine for the other clients.
    maxRetriesPerRequest: null,
  };
}

@Global()
@Module({
  providers: [
    { provide: REDIS_OPTIONS, inject: [ENV], useFactory: redisOptionsFromEnv },
    {
      provide: REDIS,
      inject: [REDIS_OPTIONS],
      useFactory: (options: RedisOptions) =>
        new Redis({ ...options, connectionName: 'manhunt-api' }),
    },
  ],
  exports: [REDIS, REDIS_OPTIONS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
