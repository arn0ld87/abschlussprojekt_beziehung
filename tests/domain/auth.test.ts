import { describe, expect, it } from "vitest";
import {
  UserSchema,
  SessionSchema,
  PasswordSchema,
  hashPassword,
  verifyPassword,
} from "../../src/domain/auth";

describe("Domain Auth Contracts (M1 #42)", () => {
  describe("UserSchema", () => {
    it("validates a valid user object", () => {
      const validUser = {
        id: "usr_123456789",
        email: "teacher@school.de",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it("rejects an invalid email address", () => {
      const invalidUser = {
        id: "usr_123456789",
        email: "not-an-email",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe("SessionSchema", () => {
    it("validates a valid session object", () => {
      const validSession = {
        id: "ses_123456789",
        userId: "usr_123456789",
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      };
      const result = SessionSchema.safeParse(validSession);
      expect(result.success).toBe(true);
    });

    it("rejects a session missing userId", () => {
      const invalidSession = {
        id: "ses_123456789",
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      const result = SessionSchema.safeParse(invalidSession);
      expect(result.success).toBe(false);
    });
  });

  describe("PasswordSchema", () => {
    it("accepts a password with 8 or more characters", () => {
      expect(PasswordSchema.safeParse("12345678").success).toBe(true);
      expect(PasswordSchema.safeParse("securePassword123!").success).toBe(true);
    });

    it("rejects a password shorter than 8 characters", () => {
      expect(PasswordSchema.safeParse("short").success).toBe(false);
    });
  });

  describe("Password Hashing", () => {
    it("hashes and successfully verifies a password", async () => {
      const password = "mySecretPassword123";
      const hash = await hashPassword(password);
      expect(hash).toContain(":");
      expect(await verifyPassword(password, hash)).toBe(true);
    });

    it("rejects an incorrect password", async () => {
      const password = "mySecretPassword123";
      const hash = await hashPassword(password);
      expect(await verifyPassword("wrongPassword", hash)).toBe(false);
    });

    it("generates different hashes for the same password due to random salt", async () => {
      const password = "samePassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });
});
