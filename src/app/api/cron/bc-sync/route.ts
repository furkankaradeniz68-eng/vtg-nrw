import { NextResponse } from "next/server";
import { syncBc } from "@/lib/bc-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel Cron sendet automatisch "Authorization: Bearer $CRON_SECRET", wenn
// die Env-Var CRON_SECRET gesetzt ist. Zusaetzlich erreichbar per manuellem
// GET mit demselben Bearer-Token (z.B. fuer einen "Jetzt aktualisieren"-Button
// im Admin-Bereich, spaeter).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET ist nicht gesetzt." }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncBc();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }, { status: 502 });
  }
}
