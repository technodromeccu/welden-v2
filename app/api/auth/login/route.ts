import { NextResponse } from "next/server";
import { authenticateUser, setSessionCookie } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { LoginSchema, parseSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const rateLimited = enforceRateLimit("auth-login", request.headers, { maxRequests: 5, windowMs: 60 * 1000 });
    if (rateLimited) {
      return rateLimited;
    }

    const parsed = parseSchema(LoginSchema, await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { email, password } = parsed.data;
    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await setSessionCookie(user);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch {
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
