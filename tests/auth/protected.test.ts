import { describe, expect, it, vi } from "vitest";
import ProtectedPage from "../../app/protected/page";
import { setGlobalAuthService, AuthService } from "../../src/services/auth";
import { InMemoryAuthRepository } from "../../src/infrastructure/auth/in-memory-repository";

// Mock next/navigation redirect
const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((url: string) => {
    const err = new Error(`NEXT_REDIRECT: ${url}`);
    (err as unknown as { digest: string }).digest = `NEXT_REDIRECT;replace;${url};302;;`;
    throw err;
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

// Mock next/headers cookies
const { mockCookieStore } = vi.hoisted(() => ({
  mockCookieStore: {
    get: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

describe("Protected Page (/protected) (M1 #42)", () => {
  it("redirects 302 to /signin when no valid session is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    await expect(ProtectedPage()).rejects.toThrow("NEXT_REDIRECT: /signin");
    expect(mockRedirect).toHaveBeenCalledWith("/signin");
  });

  it("renders protected content when a valid session is present", async () => {
    const repo = new InMemoryAuthRepository();
    const authService = new AuthService(repo);
    setGlobalAuthService(authService);

    const { session } = await authService.signUp({
      email: "protected@school.de",
      password: "securePassword123!",
    });

    mockCookieStore.get.mockReturnValue({ value: session.id });

    const jsx = await ProtectedPage();
    expect(jsx).toBeDefined();
    // JSX should contain user's email or welcome text
    const str = JSON.stringify(jsx);
    expect(str).toContain("protected@school.de");
  });
});
