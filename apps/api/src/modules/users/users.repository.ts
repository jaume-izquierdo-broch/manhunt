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
  /** Already lowercased. */
  email: string;
  passwordHash: string;
  termsVersion: string;
}

export type CreateUserResult =
  { ok: true; user: UserRow } | { ok: false; conflict: 'username' | 'email' };

/** All access to the `users` table goes through here. */
@Injectable()
export class UsersRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findById(id: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  /**
   * Case-insensitive lookup by username or email. Usernames can't contain "@",
   * so the presence of one tells which column to search.
   */
  findByIdentifier(identifier: string): Promise<UserRow | undefined> {
    const value = identifier.trim().toLowerCase();
    const column = value.includes('@') ? users.email : users.username;
    return this.db.query.users.findFirst({
      where: eq(sql`lower(${column})`, value),
    });
  }

  /** Creates the user, or reports which unique field (username or email) is taken. */
  async create(input: NewUser): Promise<CreateUserResult> {
    try {
      const [user] = await this.db.insert(users).values(input).returning();
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
