import { User } from "./user";
import { Session } from "./session";

export interface DBUser extends User {
  passwordHash: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<DBUser | null>;
  findUserById(id: string): Promise<User | null>;
  createUser(data: { id: string; email: string; passwordHash: string }): Promise<DBUser>;
  createSession(data: { id: string; userId: string; expiresAt: Date }): Promise<Session>;
  findSessionById(id: string): Promise<Session | null>;
  deleteSession(id: string): Promise<void>;
}
