import { beforeEach, describe, expect, it } from "vitest";
import { AuthService, getSession } from "../../src/services/auth";
import { InMemoryAuthRepository } from "../../src/infrastructure/auth/in-memory-repository";

describe("AuthService & Session Lifecycle (M1 #42)", () => {
  let authService: AuthService;

  beforeEach(() => {
    const repo = new InMemoryAuthRepository();
    authService = new AuthService(repo);
  });

  describe("signUp", () => {
    it("creates a user and session with valid email and password", async () => {
      const result = await authService.signUp({
        email: "teacher@school.de",
        password: "securePassword123!",
      });

      expect(result.user.email).toBe("teacher@school.de");
      expect(result.user.id).toBeDefined();
      expect(result.session.id).toBeDefined();
      expect(result.session.userId).toBe(result.user.id);
    });

    it("throws USER_ALREADY_EXISTS on duplicate email", async () => {
      await authService.signUp({
        email: "teacher@school.de",
        password: "securePassword123!",
      });

      await expect(
        authService.signUp({
          email: "teacher@school.de",
          password: "anotherPassword123!",
        }),
      ).rejects.toMatchObject({
        code: "USER_ALREADY_EXISTS",
      });
    });
  });

  describe("signIn", () => {
    it("authenticates valid credentials and returns new session", async () => {
      await authService.signUp({
        email: "teacher@school.de",
        password: "securePassword123!",
      });

      const result = await authService.signIn({
        email: "teacher@school.de",
        password: "securePassword123!",
      });

      expect(result.user.email).toBe("teacher@school.de");
      expect(result.session.id).toBeDefined();
    });

    it("throws INVALID_CREDENTIALS for wrong password", async () => {
      await authService.signUp({
        email: "teacher@school.de",
        password: "securePassword123!",
      });

      await expect(
        authService.signIn({
          email: "teacher@school.de",
          password: "wrongPassword!",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
    });

    it("throws INVALID_CREDENTIALS for non-existing email", async () => {
      await expect(
        authService.signIn({
          email: "nonexistent@school.de",
          password: "somePassword123!",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
    });
  });

  describe("signOut & validateSession", () => {
    it("invalidates session on signOut", async () => {
      const { session } = await authService.signUp({
        email: "teacher@school.de",
        password: "securePassword123!",
      });

      const validBefore = await authService.validateSession(session.id);
      expect(validBefore).not.toBeNull();

      await authService.signOut(session.id);

      const validAfter = await authService.validateSession(session.id);
      expect(validAfter).toBeNull();
    });
  });

  describe("getSession helper", () => {
    it("delivers User | null from Request with session cookie", async () => {
      const { user, session } = await authService.signUp({
        email: "teacher@school.de",
        password: "securePassword123!",
      });

      const requestWithCookie = new Request("http://localhost:3000/api/test", {
        headers: {
          cookie: `sitzplan_session=${session.id}`,
        },
      });

      const currentUser = await getSession(requestWithCookie, authService);
      expect(currentUser).not.toBeNull();
      expect(currentUser?.id).toBe(user.id);
      expect(currentUser?.email).toBe(user.email);
    });

    it("returns null when no session cookie is provided", async () => {
      const requestWithoutCookie = new Request("http://localhost:3000/api/test");
      const currentUser = await getSession(requestWithoutCookie, authService);
      expect(currentUser).toBeNull();
    });
  });
});
