import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UserDto,
} from '@manhunt/types';
import { api } from '@/lib/http/api-client';

export const authApi = {
  register: (input: RegisterInput) =>
    api.post<AuthResponse>('/auth/register', input, { auth: false }),

  login: (input: LoginInput) =>
    api.post<AuthResponse>('/auth/login', input, { auth: false }),

  me: () => api.get<UserDto>('/auth/me'),

  /**
   * Revokes a session on the server. Takes the token explicitly because the app
   * forgets it locally at the same time, and a 401 here must not sign out again.
   */
  logout: (token: string) =>
    api.post<void>('/auth/logout', undefined, { token, timeoutMs: 5_000 }),
};
