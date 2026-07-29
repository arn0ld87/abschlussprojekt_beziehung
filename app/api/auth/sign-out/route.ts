import { NextResponse } from "next/server";
import { getDefaultAuthService } from "../../../../src/services/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)sitzplan_session=([^;]+)/);
  const sessionId = match ? decodeURIComponent(match[1]) : null;

  if (sessionId) {
    const authService = getDefaultAuthService();
    try {
      await authService.signOut(sessionId);
    } catch {
      // Sign-out ist best-effort; Cookie wird in jedem Fall gelöscht.
    }
  }

  const response = NextResponse.json({ success: true }, { status: 200 });

  response.cookies.set("sitzplan_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
