import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import type { RedisOptions } from 'ioredis';
import { HttpExceptionFilter } from './common/errors/http-exception.filter.js';
import { ENV } from './config/config.module.js';
import { type Env, parseCorsOrigin } from './config/env.js';
import { REDIS_OPTIONS } from './infrastructure/redis/redis.tokens.js';
import { RedisIoAdapter } from './infrastructure/websocket/redis-io.adapter.js';

/** Configuración HTTP/WebSocket común a `main.ts` y a los tests e2e. */
export async function setupApp(app: INestApplication): Promise<void> {
  const env = app.get<Env>(ENV);
  const corsOrigin = parseCorsOrigin(env.CORS_ORIGIN);

  app.use(helmet());
  app.enableCors({ origin: corsOrigin });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const ioAdapter = new RedisIoAdapter(
    app,
    app.get<RedisOptions>(REDIS_OPTIONS),
    corsOrigin,
  );
  await ioAdapter.connect();
  app.useWebSocketAdapter(ioAdapter);
}
