import { NextResponse, type NextRequest } from "next/server";
import { isFileHref } from "@/lib/nav";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_IDLE_TIMEOUT_SECONDS,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/auth";

// Gleitender Inaktivitaets-Timeout: jede echte Anfrage einer gueltigen Session
// verlaengert sie wieder auf 60 Minuten. Ohne Anfrage fuer 60 Minuten laeuft
// der Token (und das Cookie) ab -> requireSession() leitet auf /login.
// Hier statt in den Seiten, weil nur Proxy/Route Handler Cookies setzen koennen.
function verlaengereSession(request: NextRequest, response: NextResponse): NextResponse {
  const { pathname } = request.nextUrl;
  // Login/Logout setzen das Cookie selbst - nicht dazwischenfunken, sonst
  // wuerde ein Logout durch das erneuerte Cookie wieder aufgehoben.
  if (pathname === "/api/login" || pathname === "/api/logout") return response;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) return response;

  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionToken({ ...session, exp: Date.now() + SESSION_IDLE_TIMEOUT_SECONDS * 1000 }),
    sessionCookieOptions(),
  );
  return response;
}

// VTG NRW ist ein eigenständiges, reduziertes Deployment: nur Startseite,
// Login und der komplette Mitgliederbereich sind erreichbar — nicht der
// volle Webauftritt (News, Satzung, Kontakt-Unterseiten usw.), der
// ausschliesslich im separaten VTG-RLP-Projekt/Repo läuft. Alles andere
// liefert ein echtes 404.
const EXTRA_ALLOWED_PATHS = ["/impressum", "/datenschutzerklaerung"];

function isAllowed(pathname: string): boolean {
  if (isFileHref(pathname)) return true;
  if (pathname === "/") return true;
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/mitgliederbereich")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (EXTRA_ALLOWED_PATHS.includes(pathname)) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isAllowed(pathname)) {
    return verlaengereSession(request, NextResponse.next());
  }

  const notFoundUrl = new URL("/portal-not-found", request.url);
  return NextResponse.rewrite(notFoundUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
