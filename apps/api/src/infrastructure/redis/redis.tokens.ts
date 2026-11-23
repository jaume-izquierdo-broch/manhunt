import { Inject } from '@nestjs/common';

export const REDIS = Symbol('REDIS');
export const REDIS_OPTIONS = Symbol('REDIS_OPTIONS');

/** Shared ioredis client: `constructor(@InjectRedis() redis: Redis)`. */
export const InjectRedis = () => Inject(REDIS);

/** Connection options, for code that opens its own connections (BullMQ, Socket.IO). */
export const InjectRedisOptions = () => Inject(REDIS_OPTIONS);
