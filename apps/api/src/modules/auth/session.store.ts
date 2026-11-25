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
  /** The id of the user's current session: one device at a time. */
  userSession: (userId: string) => `mh:user:${userId}:session`,
};

/**
 * Server-side sessions in Redis, one per user.
 *
 * - The client gets a random opaque token; Redis stores the session under the
 *   token's SHA-256 (the session id), so a Redis dump can't be used to log in.
 * - Every use extends the expiry (sliding expiration).
 * - Deleting the key revokes the session immediately.
 * - Logging in again (on any device) ends the previous session, so a player
 *   can't be in a match from two phones at once.
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

  /**
   * Starts a session and ends the user's previous one, if any.
   * Returns the token for the client and the id of the session it replaced.
   */
  async create(
    user: Omit<AuthUser, 'sessionId'>,
  ): Promise<{ token: string; replacedSessionId: string | null }> {
    const token = randomBytes(32).toString('base64url');
    const sessionId = sessionIdOf(token);
    const session: StoredSession = {
      userId: user.userId,
      username: user.username,
      createdAt: new Date().toISOString(),
    };

    const replacedSessionId = await this.redis.get(
      keys.userSession(user.userId),
    );
    const tx = this.redis.multi();
    if (replacedSessionId) tx.del(keys.session(replacedSessionId));
    await tx
      .set(
        keys.session(sessionId),
        JSON.stringify(session),
        'EX',
        this.ttlSeconds,
      )
      .set(keys.userSession(user.userId), sessionId, 'EX', this.ttlSeconds)
      .exec();

    return { token, replacedSessionId };
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
    await this.redis.expire(keys.userSession(session.userId), this.ttlSeconds);
    return { userId: session.userId, username: session.username, sessionId };
  }

  /** Ends a session (logout). */
  async revoke(user: AuthUser): Promise<void> {
    await this.redis.del(keys.session(user.sessionId));
    // Only clear the pointer if it still points to this session.
    if (
      (await this.redis.get(keys.userSession(user.userId))) === user.sessionId
    ) {
      await this.redis.del(keys.userSession(user.userId));
    }
  }
}

function sessionIdOf(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
