import { Injectable } from '@nestjs/common';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UserDto,
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

  async register(input: RegisterInput): Promise<AuthResponse> {
    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create(input.username, passwordHash);
    if (!user) throw AuthErrors.usernameTaken();
    return this.issueToken(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByUsername(input.username);
    // Se verifica siempre (aunque no exista) para no revelar usuarios por el tiempo de respuesta.
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) throw AuthErrors.invalidCredentials();
    return this.issueToken(user);
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw AuthErrors.unauthorized('El usuario ya no existe');
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
