import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthErrors } from '../auth.errors.js';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { TokenService } from '../token.service.js';

/**
 * Guard global: toda ruta HTTP exige `Authorization: Bearer <token>` salvo las @Public().
 * (El WebSocket se autentica aparte, en el handshake: ver `ws-auth.middleware.ts`.)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    const user =
      scheme?.toLowerCase() === 'bearer' && token
        ? await this.tokens.verify(token)
        : null;
    if (!user) throw AuthErrors.unauthorized();

    request.user = user;
    return true;
  }
}
