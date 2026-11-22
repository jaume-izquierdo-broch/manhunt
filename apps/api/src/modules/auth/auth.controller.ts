import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  type AuthResponse,
  type LoginInput,
  loginSchema,
  type RegisterInput,
  registerSchema,
  type UserDto,
} from '@manhunt/types';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ): Promise<AuthResponse> {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.auth.me(user.userId);
  }
}
