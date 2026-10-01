import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { istVerfahrenErreichbar } from "@/lib/bc-companies";

// Liefert perspektivisch die TG-Einzeldaten-XLSX des jeweiligen Mandanten aus
// dem naechtlichen BC-Export, einsehbar nur fuer den zustaendigen DLR (nicht
// den Mandanten selbst, anders als bei RLP). Anbindung folgt, sobald Erik die
// BC-Schnittstelle dafuer erweitert hat (Freigabe durch Maximilian steht noch
// aus) - bis dahin bewusst nur Zugriffsschutz + Platzhalter, damit beim
// spaeteren Anschluss nur noch der eigentliche BC-Abruf ergaenzt werden muss.
export async function GET(request: Request, { params }: { params: Promise<{ nr: string }> }) {
  const session = await requireSession();
  if (session.role !== "dlr" && session.role !== "admin") {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const { nr } = await params;
  const zugriffErlaubt = await istVerfahrenErreichbar(session, nr);
  if (!zugriffErlaubt) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  return NextResponse.json(
    { error: "TG-Einzeldaten-Export ist noch nicht angebunden." },
    { status: 503 },
  );
}
