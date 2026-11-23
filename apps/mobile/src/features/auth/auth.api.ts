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
};
