import { Injectable } from '@nestjs/common';
import {
  type AuthResponse,
  type LoginInput,
  type RegisterInput,
  TERMS_VERSION,
  type UserDto,
} from '@manhunt/types';
import type { UserRow } from '../../infrastructure/database/schema.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { toUserDto } from '../users/user.mapper.js';
import { UsersRepository } from '../users/users.repository.js';
import { AuthErrors } from './auth.errors.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password.js';
import type { AuthUser } from './auth.types.js';
import { SessionStore } from './session.store.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: SessionStore,
    private readonly realtime: RealtimePublisher,
  ) {}

  /** The schema has already checked that `acceptTerms` is true. */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const result = await this.users.create({
      username: input.username,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      termsVersion: TERMS_VERSION,
    });
    if (!result.ok) {
      throw result.conflict === 'email'
        ? AuthErrors.emailTaken()
        : AuthErrors.usernameTaken();
    }
    return this.startSession(result.user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByIdentifier(input.identifier);
    // Always run the hash check, even for unknown users, so response time
    // doesn't reveal which accounts exist.
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) throw AuthErrors.invalidCredentials();
    return this.startSession(user);
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw AuthErrors.unauthorized('This user no longer exists');
    return toUserDto(user);
  }

  /** Ends the session the request authenticated with, and closes its sockets. */
  async logout(user: AuthUser): Promise<void> {
    await this.sessions.revoke(user);
    this.realtime.disconnectSession(user.sessionId);
  }

  /**
   * One session per user: logging in on another device ends the previous
   * session and disconnects it from any match.
   */
  private async startSession(user: UserRow): Promise<AuthResponse> {
    const { token, replacedSessionId } = await this.sessions.create({
      userId: user.id,
      username: user.username,
    });
    if (replacedSessionId) this.realtime.disconnectSession(replacedSessionId);
    return { accessToken: token, user: toUserDto(user) };
  }
}
