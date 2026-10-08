import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyCredentials } from "@/lib/credentials";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_SECONDS,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Benutzername und Passwort erforderlich." }, { status: 400 });
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return NextResponse.json({ error: "Benutzername oder Passwort ist falsch." }, { status: 401 });
  }

  const token = createSessionToken({
    username: user.username,
    role: user.role,
    exp: Date.now() + SESSION_IDLE_TIMEOUT_SECONDS * 1000,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());

  return NextResponse.json({ ok: true, role: user.role });
}
