import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { POST as signUp } from "../../app/api/auth/sign-up/route";
import { POST as signOut } from "../../app/api/auth/sign-out/route";
import { AuthService } from "../../src/services/auth/auth-service";
import { InMemoryAuthRepository } from "../../src/infrastructure/auth/in-memory-repository";
import { setGlobalAuthService, getSession } from "../../src/services/auth/get-session";

describe("POST /api/auth/sign-out (M1 #42)", () => {
  beforeEach(() => {
    setGlobalAuthService(new AuthService(new InMemoryAuthRepository()));
  });

  afterEach(() => {
    setGlobalAuthService(null);
  });

  it("invalidates session and clears session cookie", async () => {
    const signUpRes = await signUp(
      new Request("http://localhost:3000/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "signout@school.de",
          password: "securePassword123!",
        }),
      }),
    );
    expect(signUpRes.status).toBe(200);

    const setCookie = signUpRes.headers.get("Set-Cookie") ?? "";
    const sessionMatch = setCookie.match(/sitzplan_session=([^;]+)/);
    const sessionId = sessionMatch ? sessionMatch[1] : "";
    expect(sessionId).not.toBe("");

    const req = new Request("http://localhost:3000/api/auth/sign-out", {
      method: "POST",
      headers: {
        cookie: `sitzplan_session=${sessionId}`,
      },
    });

    const res = await signOut(req);
    expect(res.status).toBe(200);

    const clearCookieHeader = res.headers.get("Set-Cookie");
    expect(clearCookieHeader).toContain("sitzplan_session=;");
    expect(clearCookieHeader).toContain("Max-Age=0");

    const json = await res.json();
    expect(json.success).toBe(true);

    const activeUser = await getSession(req);
    expect(activeUser).toBeNull();
  });
});
