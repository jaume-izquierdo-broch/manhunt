import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import type { RedisOptions } from 'ioredis';
import { HttpExceptionFilter } from './common/errors/http-exception.filter.js';
import { ENV, type Env, parseCorsOrigin } from './config/env.js';
import { REDIS_OPTIONS } from './infrastructure/redis/redis.tokens.js';
import { RedisIoAdapter } from './infrastructure/websocket/redis-io.adapter.js';

/** HTTP and WebSocket setup shared by `main.ts` and the e2e tests. */
export function setupApp(app: INestApplication): void {
  const env = app.get<Env>(ENV);
  const corsOrigin = parseCorsOrigin(env.CORS_ORIGIN);

  app.use(helmet());
  app.enableCors({ origin: corsOrigin });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  app.useWebSocketAdapter(
    new RedisIoAdapter(app, app.get<RedisOptions>(REDIS_OPTIONS), corsOrigin),
  );
}
