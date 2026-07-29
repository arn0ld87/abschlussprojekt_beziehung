import { randomUUID } from "node:crypto";
import {
  User,
  Session,
  UserSchema,
  PasswordSchema,
  hashPassword,
  verifyPassword,
  AuthRepository,
} from "../../domain/auth";

export class AuthError extends Error {
  constructor(
    public readonly code: "USER_ALREADY_EXISTS" | "INVALID_CREDENTIALS" | "INVALID_INPUT",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthService {
  constructor(private repository: AuthRepository) {}

  private async createSessionForUser(userId: string): Promise<Session> {
    const sessionId = `ses_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.repository.createSession({
      id: sessionId,
      userId,
      expiresAt,
    });
  }

  async signUp(input: {
    email: string;
    password: string;
  }): Promise<{ user: User; session: Session }> {
    const emailResult = UserSchema.shape.email.safeParse(input.email);
    if (!emailResult.success) {
      throw new AuthError("INVALID_INPUT", "Ungültige E-Mail-Adresse.");
    }

    const passwordResult = PasswordSchema.safeParse(input.password);
    if (!passwordResult.success) {
      throw new AuthError("INVALID_INPUT", "Passwort erfüllt nicht die Anforderungen.");
    }

    const email = input.email.toLowerCase();
    const existing = await this.repository.findUserByEmail(email);
    if (existing) {
      throw new AuthError("USER_ALREADY_EXISTS", "Benutzer mit dieser E-Mail existiert bereits.");
    }

    const passwordHash = await hashPassword(input.password);
    const userId = `usr_${randomUUID()}`;
    const dbUser = await this.repository.createUser({
      id: userId,
      email,
      passwordHash,
    });

    const session = await this.createSessionForUser(userId);

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
    return { user, session };
  }

  async signIn(input: {
    email: string;
    password: string;
  }): Promise<{ user: User; session: Session }> {
    const email = input.email.toLowerCase();
    const dbUser = await this.repository.findUserByEmail(email);
    if (!dbUser) {
      throw new AuthError("INVALID_CREDENTIALS", "Ungültige Anmeldedaten.");
    }

    const passwordValid = await verifyPassword(input.password, dbUser.passwordHash);
    if (!passwordValid) {
      throw new AuthError("INVALID_CREDENTIALS", "Ungültige Anmeldedaten.");
    }

    const session = await this.createSessionForUser(dbUser.id);

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
    return { user, session };
  }

  async signOut(sessionId: string): Promise<void> {
    if (!sessionId) return;
    await this.repository.deleteSession(sessionId);
  }

  async validateSession(
    sessionId: string,
  ): Promise<{ user: User; session: Session } | null> {
    if (!sessionId) return null;
    const session = await this.repository.findSessionById(sessionId);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.repository.deleteSession(sessionId);
      return null;
    }

    const user = await this.repository.findUserById(session.userId);
    if (!user) return null;

    return { user, session };
  }
}
