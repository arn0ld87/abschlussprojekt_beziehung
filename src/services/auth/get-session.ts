import { User } from "../../domain/auth";
import { AuthService } from "./auth-service";
import { InMemoryAuthRepository } from "../../infrastructure/auth/in-memory-repository";
import { DrizzleAuthRepository } from "../../infrastructure/auth/drizzle-repository";

let defaultAuthService: AuthService | null = null;

export function getDefaultAuthService(): AuthService {
  if (!defaultAuthService) {
    if (process.env.DATABASE_URL) {
      defaultAuthService = new AuthService(new DrizzleAuthRepository());
    } else if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      defaultAuthService = new AuthService(new InMemoryAuthRepository());
    } else {
      throw new Error("DATABASE_URL is required to initialize AuthService in non-test environments.");
    }
  }
  return defaultAuthService;
}

export function setGlobalAuthService(service: AuthService | null): void {
  defaultAuthService = service;
}

export async function getSessionBySessionId(
  sessionId: string | null,
  authService?: AuthService,
): Promise<User | null> {
  if (!sessionId) return null;
  const service = authService ?? getDefaultAuthService();
  const result = await service.validateSession(sessionId);
  return result ? result.user : null;
}

export async function getSession(
  req?: Request,
  customAuthService?: AuthService,
): Promise<User | null> {
  const service = customAuthService ?? getDefaultAuthService();
  let sessionId: string | null = null;

  if (req) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)sitzplan_session=([^;]+)/);
    if (match) {
      sessionId = decodeURIComponent(match[1]);
    }
  } else {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const cookie = cookieStore.get("sitzplan_session");
      if (cookie) {
        sessionId = cookie.value;
      }
    } catch {
      // Ignored if not in Next.js Server Component context
    }
  }

  return getSessionBySessionId(sessionId, service);
}
