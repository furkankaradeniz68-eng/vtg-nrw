import { NextResponse, type NextRequest } from "next/server";
import { isFileHref } from "@/lib/nav";

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
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (EXTRA_ALLOWED_PATHS.includes(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isAllowed(pathname)) {
    return NextResponse.next();
  }

  const notFoundUrl = new URL("/portal-not-found", request.url);
  return NextResponse.rewrite(notFoundUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
