import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser, JwtPayload } from './auth.types.js';

/** Firma y verifica JWT. Lo usan el guard HTTP y el middleware del WebSocket. */
@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(user: AuthUser): Promise<string> {
    const payload: JwtPayload = { sub: user.userId, username: user.username };
    return this.jwt.signAsync(payload);
  }

  /** `null` si el token es inválido o ha caducado. */
  async verify(token: string): Promise<AuthUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return { userId: payload.sub, username: payload.username };
    } catch {
      return null;
    }
  }
}
