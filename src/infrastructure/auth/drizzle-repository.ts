import { eq } from "drizzle-orm";
import { AuthRepository, DBUser } from "./auth-repository";
import { User, Session } from "../../domain/auth";
import { getDb } from "../db/client";
import { users, sessions } from "../db/schema";

export class DrizzleAuthRepository implements AuthRepository {
  private db = getDb();

  async findUserByEmail(email: string): Promise<DBUser | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (result.length === 0) return null;
    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findUserById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (result.length === 0) return null;
    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createUser(data: {
    id: string;
    email: string;
    passwordHash: string;
  }): Promise<DBUser> {
    const now = new Date();
    const [row] = await this.db
      .insert(users)
      .values({
        id: data.id,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createSession(data: {
    id: string;
    userId: string;
    expiresAt: Date;
  }): Promise<Session> {
    const now = new Date();
    const [row] = await this.db
      .insert(sessions)
      .values({
        id: data.id,
        userId: data.userId,
        expiresAt: data.expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: row.id,
      userId: row.userId,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }

  async findSessionById(id: string): Promise<Session | null> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (result.length === 0) return null;
    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }
}
