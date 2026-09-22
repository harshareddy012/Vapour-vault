import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { User } from '@dfs-sss/shared-types';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('UserRepository');

export class UserRepository {
  async createUser(user: User): Promise<User> {
    logger.debug({ userId: user.id, email: user.email }, 'Inserting new user into database');
    const [inserted] = await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        createdAt: new Date(user.createdAt),
      })
      .returning();

    return {
      id: inserted.id,
      email: inserted.email,
      passwordHash: inserted.passwordHash,
      createdAt: inserted.createdAt.toISOString(),
    };
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

export const userRepository = new UserRepository();
