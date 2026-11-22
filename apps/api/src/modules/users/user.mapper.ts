import type { UserDto } from '@manhunt/types';
import type { UserRow } from '../../infrastructure/database/schema.js';

/** Fila de BD -> DTO público (nunca expone el hash de la contraseña). */
export function toUserDto(user: UserRow): UserDto {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt.toISOString(),
  };
}
