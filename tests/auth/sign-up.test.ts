import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { POST } from "../../app/api/auth/sign-up/route";
import { AuthService } from "../../src/services/auth/auth-service";
import { InMemoryAuthRepository } from "../../src/infrastructure/auth/in-memory-repository";
import { setGlobalAuthService } from "../../src/services/auth/get-session";

describe("POST /api/auth/sign-up (M1 #42)", () => {
  beforeEach(() => {
    setGlobalAuthService(new AuthService(new InMemoryAuthRepository()));
  });

  afterEach(() => {
    setGlobalAuthService(null);
  });

  it("creates user and returns 200 + session cookie on valid sign-up", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "newteacher@school.de",
        password: "securePassword123!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const cookieHeader = res.headers.get("Set-Cookie");
    expect(cookieHeader).toContain("sitzplan_session=");
    expect(cookieHeader).toContain("HttpOnly");

    const json = await res.json();
    expect(json.user).toBeDefined();
    expect(json.user.email).toBe("newteacher@school.de");
    expect(json.session).toBeDefined();
  });

  it("returns 409 with USER_ALREADY_EXISTS on duplicate email", async () => {
    const req1 = new Request("http://localhost:3000/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "duplicate@school.de",
        password: "securePassword123!",
      }),
    });
    await POST(req1);

    const req2 = new Request("http://localhost:3000/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "duplicate@school.de",
        password: "anotherPassword123!",
      }),
    });

    const res = await POST(req2);
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.code ?? json.error?.code).toBe("USER_ALREADY_EXISTS");
  });

  it("returns 400 on invalid input", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invalid-email",
        password: "short",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
