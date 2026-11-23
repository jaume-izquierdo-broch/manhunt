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
  /** Ping number for `ping` jobs; 0 for the others. */
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
      // Kept for a while so their job ids keep deduplicating repeated schedules.
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });
}

/** Deterministic job id: scheduling the same timer twice creates a single job. */
const jobId = (job: TimerJob) => `${job.kind}-${job.matchId}-${job.seq}`;

/**
 * Match timers on top of BullMQ (delayed jobs stored in Redis):
 * - they survive API restarts;
 * - with several replicas, each job runs on exactly one of them.
 *
 * This class only schedules and runs jobs. WHAT each timer does is decided by
 * `MatchLifecycleService`, which registers the handler.
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

  /** The worker starts once every module is initialized, so the handler is registered by then. */
  onApplicationBootstrap() {
    this.worker = new Worker<TimerJob>(
      QUEUE_NAME,
      async (job: Job<TimerJob>) => {
        if (!this.handler) throw new Error('No timer handler registered');
        await this.handler(job.data);
      },
      {
        connection: connection(this.redisOptions, 'manhunt-timers-worker'),
        prefix: KEY_PREFIX,
        concurrency: 20,
      },
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Timer ${job?.id} failed: ${err.message}`),
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
