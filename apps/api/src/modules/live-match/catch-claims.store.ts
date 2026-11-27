import { Injectable } from '@nestjs/common';
import { CATCH_CONFIRM_MS, type CatchClaim } from '@manhunt/types';
import type { Redis } from 'ioredis';
import { InjectRedis } from '../../infrastructure/redis/redis.tokens.js';

/** Kept a while after it expires, in case its timer runs late. */
const TTL_MS = CATCH_CONFIRM_MS + 5 * 60_000;

const key = (matchId: string, runnerId: string) =>
  `mh:match:${matchId}:catch:${runnerId}`;

/**
 * Catches waiting for the runner's answer, in Redis: at most one per runner.
 * Whoever takes a claim first (the runner's answer or the timer) decides it.
 */
@Injectable()
export class CatchClaimsStore {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /** False if that runner already has a catch waiting. */
  async create(claim: CatchClaim): Promise<boolean> {
    const done = await this.redis.set(
      key(claim.matchId, claim.runnerId),
      JSON.stringify(claim),
      'PX',
      TTL_MS,
      'NX',
    );
    return done === 'OK';
  }

  async get(matchId: string, runnerId: string): Promise<CatchClaim | null> {
    const raw = await this.redis.get(key(matchId, runnerId));
    return raw ? (JSON.parse(raw) as CatchClaim) : null;
  }

  /** Removes the claim and returns it; null if someone else took it first. */
  async take(matchId: string, runnerId: string): Promise<CatchClaim | null> {
    const raw = await this.redis.getdel(key(matchId, runnerId));
    return raw ? (JSON.parse(raw) as CatchClaim) : null;
  }
}
