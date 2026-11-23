import { Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { createHash, randomBytes } from 'node:crypto';
import { type Env, InjectEnv } from '../../config/env.js';
import { InjectRedis } from '../../infrastructure/redis/redis.tokens.js';
import type { AuthUser } from './auth.types.js';

/** What Redis keeps for each session. */
interface StoredSession {
  userId: string;
  username: string;
  createdAt: string;
}

const keys = {
  session: (sessionId: string) => `mh:session:${sessionId}`,
  /** Set of a user's session ids, for "log out everywhere". */
  userSessions: (userId: string) => `mh:user:${userId}:sessions`,
};

/**
 * Server-side sessions in Redis.
 *
 * The client gets a random opaque token; Redis stores the session under the
 * token's SHA-256 (the session id), so a Redis dump can't be used to log in.
 * Every use extends the expiry (sliding expiration), and deleting the key
 * revokes the session immediately.
 */
@Injectable()
export class SessionStore {
  private readonly ttlSeconds: number;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectEnv() env: Env,
  ) {
    this.ttlSeconds = env.SESSION_TTL_SECONDS;
  }

  /** Starts a session and returns the token to hand to the client. */
  async create(user: Omit<AuthUser, 'sessionId'>): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const sessionId = sessionIdOf(token);
    const session: StoredSession = {
      userId: user.userId,
      username: user.username,
      createdAt: new Date().toISOString(),
    };
    await this.redis
      .multi()
      .set(
        keys.session(sessionId),
        JSON.stringify(session),
        'EX',
        this.ttlSeconds,
      )
      .sadd(keys.userSessions(user.userId), sessionId)
      .expire(keys.userSessions(user.userId), this.ttlSeconds)
      .exec();
    return token;
  }

  /** The user behind a token, or `null` if it's unknown, expired or revoked. Extends the expiry. */
  async verify(token: string): Promise<AuthUser | null> {
    const sessionId = sessionIdOf(token);
    const raw = await this.redis.getex(
      keys.session(sessionId),
      'EX',
      this.ttlSeconds,
    );
    if (!raw) return null;

    const session = JSON.parse(raw) as StoredSession;
    // Keep the index alive for as long as its newest session.
    await this.redis.expire(keys.userSessions(session.userId), this.ttlSeconds);
    return { userId: session.userId, username: session.username, sessionId };
  }

  async revoke(user: AuthUser): Promise<void> {
    await this.redis
      .multi()
      .del(keys.session(user.sessionId))
      .srem(keys.userSessions(user.userId), user.sessionId)
      .exec();
  }

  /** Revokes every session of a user and returns their ids. */
  async revokeAll(userId: string): Promise<string[]> {
    const sessionIds = await this.redis.smembers(keys.userSessions(userId));
    await this.redis.del(
      keys.userSessions(userId),
      ...sessionIds.map(keys.session),
    );
    return sessionIds;
  }
}

function sessionIdOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
