import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import {
  type Database,
  InjectDb,
} from '../../infrastructure/database/database.tokens.js';
import { isUniqueViolation } from '../../infrastructure/database/pg-errors.js';
import { type UserRow, users } from '../../infrastructure/database/schema.js';

export interface NewUser {
  username: string;
  /** Ya normalizado en minúsculas. */
  email: string;
  passwordHash: string;
  termsVersion: string;
}

export type CreateUserResult =
  { ok: true; user: UserRow } | { ok: false; conflict: 'username' | 'email' };

/** Acceso a la tabla `users`. Ningún otro sitio consulta esta tabla directamente. */
@Injectable()
export class UsersRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findById(id: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  /**
   * Busca por nombre de usuario o por email (sin distinguir mayúsculas).
   * Los nombres de usuario no pueden contener "@", así que no hay ambigüedad.
   */
  findByIdentifier(identifier: string): Promise<UserRow | undefined> {
    const value = identifier.trim().toLowerCase();
    const column = value.includes('@') ? users.email : users.username;
    return this.db.query.users.findFirst({
      where: eq(sql`lower(${column})`, value),
    });
  }

  /** Crea el usuario; si el nombre o el email ya existen, dice cuál. */
  async create(input: NewUser): Promise<CreateUserResult> {
    try {
      const [user] = await this.db
        .insert(users)
        .values({ ...input, termsAcceptedAt: new Date() })
        .returning();
      return { ok: true, user: user! };
    } catch (error) {
      if (isUniqueViolation(error, 'users_username_lower_uq')) {
        return { ok: false, conflict: 'username' };
      }
      if (isUniqueViolation(error, 'users_email_lower_uq')) {
        return { ok: false, conflict: 'email' };
      }
      throw error;
    }
  }
}
