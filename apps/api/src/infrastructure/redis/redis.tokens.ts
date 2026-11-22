import { Inject } from '@nestjs/common';

export const REDIS = Symbol('REDIS');
export const REDIS_OPTIONS = Symbol('REDIS_OPTIONS');

/** Cliente ioredis compartido: `constructor(@InjectRedis() redis: Redis)`. */
export const InjectRedis = () => Inject(REDIS);
/** Opciones de conexión, para quien necesita sus propias conexiones (BullMQ, Socket.IO). */
export const InjectRedisOptions = () => Inject(REDIS_OPTIONS);
