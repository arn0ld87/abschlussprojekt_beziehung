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
          code: "INVALID_INPUT",
          error: { code: "INVALID_INPUT", message: "E-Mail und Passwort erforderlich." },
        },
        { status: 400 },
      );
    }

    const authService = getDefaultAuthService();
    const { user, session } = await authService.signUp({ email, password });

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
    console.error("Sign-up error:", err);
    if (err instanceof AuthError) {
      if (err.code === "USER_ALREADY_EXISTS") {
        return NextResponse.json(
          {
            code: "USER_ALREADY_EXISTS",
            error: { code: "USER_ALREADY_EXISTS", message: err.message },
          },
          { status: 409 },
        );
      }
      if (err.code === "INVALID_INPUT") {
        return NextResponse.json(
          {
            code: "INVALID_INPUT",
            error: { code: "INVALID_INPUT", message: err.message },
          },
          { status: 400 },
        );
      }
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
