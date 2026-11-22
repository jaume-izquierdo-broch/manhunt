import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { type ConnectionOptions, type Job, Queue, Worker } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { InjectRedisOptions } from '../../infrastructure/redis/redis.tokens.js';

export type TimerKind = 'hiding-end' | 'ping' | 'match-end';

export interface TimerJob {
  matchId: string;
  kind: TimerKind;
  /** Número de ping (solo para `ping`; 0 en los demás). */
  seq: number;
}

export type TimerHandler = (job: TimerJob) => Promise<void>;

const QUEUE_NAME = 'match-timers';
const KEY_PREFIX = 'mh-bull';

function connection(options: RedisOptions, name: string): ConnectionOptions {
  return {
    host: options.host,
    port: options.port,
    password: options.password,
    maxRetriesPerRequest: null,
    connectionName: name,
  };
}

function createQueue(options: RedisOptions) {
  return new Queue<TimerJob>(QUEUE_NAME, {
    connection: connection(options, 'manhunt-timers-queue'),
    prefix: KEY_PREFIX,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      // Se conservan un tiempo para que el jobId siga deduplicando.
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });
}

/** jobId determinista: programar dos veces lo mismo no crea dos trabajos. */
const jobId = (job: TimerJob) => `${job.kind}-${job.matchId}-${job.seq}`;

/**
 * Temporizadores de partida sobre BullMQ (trabajos retrasados en Redis).
 * - Sobreviven a reinicios de la API.
 * - Con varias réplicas, cada trabajo lo ejecuta UNA sola.
 *
 * Esta clase solo sabe programar y ejecutar; QUÉ pasa en cada temporizador
 * lo decide `MatchLifecycleService` registrando su handler.
 */
@Injectable()
export class MatchTimersQueue
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MatchTimersQueue.name);
  private readonly queue: ReturnType<typeof createQueue>;
  private worker?: Worker<TimerJob>;
  private handler?: TimerHandler;

  constructor(
    @InjectRedisOptions() private readonly redisOptions: RedisOptions,
  ) {
    this.queue = createQueue(redisOptions);
  }

  setHandler(handler: TimerHandler) {
    this.handler = handler;
  }

  /** El worker arranca cuando ya están todos los módulos inicializados (y el handler registrado). */
  onApplicationBootstrap() {
    this.worker = new Worker<TimerJob>(
      QUEUE_NAME,
      async (job: Job<TimerJob>) => {
        if (!this.handler)
          throw new Error('Handler de temporizadores sin registrar');
        await this.handler(job.data);
      },
      {
        connection: connection(this.redisOptions, 'manhunt-timers-worker'),
        prefix: KEY_PREFIX,
        concurrency: 20,
      },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Temporizador ${job?.id} falló: ${err.message}`),
    );
  }

  async onApplicationShutdown() {
    await this.worker?.close();
    await this.queue.close();
  }

  async schedule(job: TimerJob, at: Date): Promise<void> {
    await this.queue.add(job.kind, job, {
      jobId: jobId(job),
      delay: Math.max(0, at.getTime() - Date.now()),
    });
  }

  async cancel(job: TimerJob): Promise<void> {
    await this.queue.remove(jobId(job)).catch(() => undefined);
  }
}
