import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";

export type SessionRole = "abonnent" | "dlr" | "admin";

export type SessionPayload = {
  username: string;
  role: SessionRole;
  exp: number;
};

export const SESSION_COOKIE_NAME = "vtg_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 Tage

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET ist nicht gesetzt.");
  return secret;
}

function sign(body: string): string {
  return crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
}

export function createSessionToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// DLR and Admin ("intern") only — Abonnent has no access to these pages.
export async function requireInternSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role === "abonnent") redirect("/");
  return session;
}

// Admin only.
export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/");
  return session;
}
