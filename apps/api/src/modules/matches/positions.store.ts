import { Injectable } from '@nestjs/common';
import type { PingRevealPayload, PositionDto } from '@manhunt/types';
import type { Redis } from 'ioredis';
import { InjectRedis } from '../../infrastructure/redis/redis.tokens.js';

/** Keys expire on their own, in case a match is never cleaned up. */
const TTL_SECONDS = 12 * 60 * 60;

const keys = {
  positions: (matchId: string) => `mh:match:${matchId}:positions`,
  lastPing: (matchId: string) => `mh:match:${matchId}:last-ping`,
};

/**
 * Short-lived match state in Redis: each player's latest position (a hash of
 * userId -> JSON) and the latest ping. It changes every few seconds, so it
 * doesn't belong in Postgres.
 */
@Injectable()
export class PositionsStore {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async set(matchId: string, position: PositionDto): Promise<void> {
    const key = keys.positions(matchId);
    await this.redis
      .multi()
      .hset(key, position.userId, JSON.stringify(position))
      .expire(key, TTL_SECONDS)
      .exec();
  }

  async get(matchId: string, userId: string): Promise<PositionDto | null> {
    const raw = await this.redis.hget(keys.positions(matchId), userId);
    return raw ? (JSON.parse(raw) as PositionDto) : null;
  }

  async getMany(matchId: string, userIds: string[]): Promise<PositionDto[]> {
    if (userIds.length === 0) return [];
    const raws = await this.redis.hmget(keys.positions(matchId), ...userIds);
    return raws
      .filter((raw): raw is string => raw !== null)
      .map((raw) => JSON.parse(raw) as PositionDto);
  }

  async remove(matchId: string, userId: string): Promise<void> {
    await this.redis.hdel(keys.positions(matchId), userId);
  }

  async setLastPing(matchId: string, ping: PingRevealPayload): Promise<void> {
    await this.redis.set(
      keys.lastPing(matchId),
      JSON.stringify(ping),
      'EX',
      TTL_SECONDS,
    );
  }

  async getLastPing(matchId: string): Promise<PingRevealPayload | null> {
    const raw = await this.redis.get(keys.lastPing(matchId));
    return raw ? (JSON.parse(raw) as PingRevealPayload) : null;
  }

  /** Called when the match ends. */
  async clear(matchId: string): Promise<void> {
    await this.redis.del(keys.positions(matchId), keys.lastPing(matchId));
  }
}
