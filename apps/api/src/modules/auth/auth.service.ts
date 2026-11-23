import { Injectable } from '@nestjs/common';
import {
  type AuthResponse,
  type LoginInput,
  type RegisterInput,
  TERMS_VERSION,
  type UserDto,
} from '@manhunt/types';
import type { UserRow } from '../../infrastructure/database/schema.js';
import { toUserDto } from '../users/user.mapper.js';
import { UsersRepository } from '../users/users.repository.js';
import { AuthErrors } from './auth.errors.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly tokens: TokenService,
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
    return this.issueToken(result.user);
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
    return this.issueToken(user);
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw AuthErrors.unauthorized('This user no longer exists');
    return toUserDto(user);
  }

  private async issueToken(user: UserRow): Promise<AuthResponse> {
    const accessToken = await this.tokens.sign({
      userId: user.id,
      username: user.username,
    });
    return { accessToken, user: toUserDto(user) };
  }
}
