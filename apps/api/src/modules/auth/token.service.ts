import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser, JwtPayload } from './auth.types.js';

/** Signs and verifies JWTs, for both the HTTP guard and the WebSocket handshake. */
@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(user: AuthUser): Promise<string> {
    const payload: JwtPayload = { sub: user.userId, username: user.username };
    return this.jwt.signAsync(payload);
  }

  /** Returns `null` when the token is invalid or expired. */
  async verify(token: string): Promise<AuthUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return { userId: payload.sub, username: payload.username };
    } catch {
      return null;
    }
  }
}
