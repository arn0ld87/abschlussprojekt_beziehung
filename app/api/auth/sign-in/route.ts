import { NextResponse } from "next/server";
import { getDefaultAuthService, AuthError } from "../../../../src/services/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    let email = "";
    let password = "";

    const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await req.formData().catch(() => new FormData());
      email = formData.get("email")?.toString().trim() ?? "";
      password = formData.get("password")?.toString() ?? "";
    } else {
      const body = await req.json().catch(() => ({}));
      email = body?.email?.toString().trim() ?? "";
      password = body?.password?.toString() ?? "";
    }

    if (!email || !password) {
      return NextResponse.json(
        {
          code: "INVALID_CREDENTIALS",
          error: { code: "INVALID_CREDENTIALS", message: "E-Mail und Passwort erforderlich." },
        },
        { status: 401 },
      );
    }

    const authService = getDefaultAuthService();
    const { user, session } = await authService.signIn({ email, password });

    const response = NextResponse.json(
      {
        user,
        session: {
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
      },
      { status: 200 },
    );

    response.cookies.set("sitzplan_session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    if (err instanceof AuthError && err.code === "INVALID_CREDENTIALS") {
      return NextResponse.json(
        {
          code: "INVALID_CREDENTIALS",
          error: { code: "INVALID_CREDENTIALS", message: err.message },
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        error: { code: "INTERNAL_ERROR", message: "Ein unerwarteter Fehler ist aufgetreten." },
      },
      { status: 500 },
    );
  }
}
