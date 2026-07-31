import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { POST as signUp } from "../../app/api/auth/sign-up/route";
import { POST as signIn } from "../../app/api/auth/sign-in/route";
import { AuthService } from "../../src/services/auth/auth-service";
import { InMemoryAuthRepository } from "../../src/infrastructure/auth/in-memory-repository";
import { setGlobalAuthService } from "../../src/services/auth/get-session";

describe("POST /api/auth/sign-in (M1 #42)", () => {
  beforeEach(() => {
    setGlobalAuthService(new AuthService(new InMemoryAuthRepository()));
  });

  afterEach(() => {
    setGlobalAuthService(null);
  });

  it("authenticates valid user and returns 200 + session cookie", async () => {
    await signUp(
      new Request("http://localhost:3000/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "signin@school.de",
          password: "securePassword123!",
        }),
      }),
    );

    const req = new Request("http://localhost:3000/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "signin@school.de",
        password: "securePassword123!",
      }),
    });

    const res = await signIn(req);
    expect(res.status).toBe(200);

    const cookieHeader = res.headers.get("Set-Cookie");
    expect(cookieHeader).toContain("sitzplan_session=");

    const json = await res.json();
    expect(json.user.email).toBe("signin@school.de");
    expect(json.session).toBeDefined();
  });

  it("returns 401 with INVALID_CREDENTIALS on wrong password", async () => {
    await signUp(
      new Request("http://localhost:3000/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "wrongpass@school.de",
          password: "securePassword123!",
        }),
      }),
    );

    const req = new Request("http://localhost:3000/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "wrongpass@school.de",
        password: "wrongPassword123!",
      }),
    });

    const res = await signIn(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.code ?? json.error?.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 with INVALID_CREDENTIALS on non-existing user", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent@school.de",
        password: "somePassword123!",
      }),
    });

    const res = await signIn(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.code ?? json.error?.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 500 with INTERNAL_ERROR on unexpected error", async () => {
    const authService = new AuthService(new InMemoryAuthRepository());
    vi.spyOn(authService, "signIn").mockRejectedValue(new Error("Generic DB failure"));
    setGlobalAuthService(authService);

    const req = new Request("http://localhost:3000/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "any@school.de",
        password: "anyPassword123!",
      }),
    });

    const res = await signIn(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.code).toBe("INTERNAL_ERROR");
  });
});
