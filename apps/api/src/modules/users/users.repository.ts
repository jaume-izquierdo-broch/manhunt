import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import {
  type Database,
  InjectDb,
} from '../../infrastructure/database/database.tokens.js';
import { isUniqueViolation } from '../../infrastructure/database/pg-errors.js';
import { type UserRow, users } from '../../infrastructure/database/schema.js';

/** Acceso a la tabla `users`. Ningún otro sitio consulta esta tabla directamente. */
@Injectable()
export class UsersRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findById(id: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  /** El nombre de usuario no distingue mayúsculas (índice único sobre lower(username)). */
  findByUsername(username: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({
      where: eq(sql`lower(${users.username})`, username.toLowerCase()),
    });
  }

  /** Devuelve `null` si el nombre ya existe. */
  async create(
    username: string,
    passwordHash: string,
  ): Promise<UserRow | null> {
    try {
      const [user] = await this.db
        .insert(users)
        .values({ username, passwordHash })
        .returning();
      return user!;
    } catch (error) {
      if (isUniqueViolation(error, 'users_username_lower_uq')) return null;
      throw error;
    }
  }
}
