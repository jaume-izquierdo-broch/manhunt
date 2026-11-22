import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth.types.js';

export type AuthenticatedRequest = Request & { user: AuthUser };

/** Usuario de la petición HTTP actual (lo pone `JwtAuthGuard`). */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
