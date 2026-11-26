import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';
import { SessionStore } from './session.store.js';

@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionStore,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
  exports: [SessionStore],
})
export class AuthModule {}
