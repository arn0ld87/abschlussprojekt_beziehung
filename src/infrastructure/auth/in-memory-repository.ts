import { AuthRepository, DBUser } from "./auth-repository";
import { User, Session } from "../../domain/auth";

export class InMemoryAuthRepository implements AuthRepository {
  private usersMap = new Map<string, DBUser>();
  private sessionsMap = new Map<string, Session>();

  async findUserByEmail(email: string): Promise<DBUser | null> {
    const lower = email.toLowerCase();
    for (const u of this.usersMap.values()) {
      if (u.email.toLowerCase() === lower) {
        return u;
      }
    }
    return null;
  }

  async findUserById(id: string): Promise<User | null> {
    const dbUser = this.usersMap.get(id);
    if (!dbUser) return null;
    const { id: userId, email, createdAt, updatedAt } = dbUser;
    return { id: userId, email, createdAt, updatedAt };
  }

  async createUser(data: {
    id: string;
    email: string;
    passwordHash: string;
  }): Promise<DBUser> {
    const now = new Date();
    const dbUser: DBUser = {
      id: data.id,
      email: data.email,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.usersMap.set(data.id, dbUser);
    return dbUser;
  }

  async createSession(data: {
    id: string;
    userId: string;
    expiresAt: Date;
  }): Promise<Session> {
    const session: Session = {
      id: data.id,
      userId: data.userId,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    };
    this.sessionsMap.set(data.id, session);
    return session;
  }

  async findSessionById(id: string): Promise<Session | null> {
    return this.sessionsMap.get(id) ?? null;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessionsMap.delete(id);
  }
}
