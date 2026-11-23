import type { UserDto } from '@manhunt/types';
import type { UserRow } from '../../infrastructure/database/schema.js';

/** Database row -> public DTO. Never exposes the password hash. */
export function toUserDto(user: UserRow): UserDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
