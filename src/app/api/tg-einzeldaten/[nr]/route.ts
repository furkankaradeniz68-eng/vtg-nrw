import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { istVerfahrenErreichbar } from "@/lib/bc-companies";
import { fetchBcExportFile } from "@/lib/bc-client";

export const maxDuration = 60;

// Liefert die TG-Einzeldaten-XLSX des angefragten Mandanten aus dem
// naechtlichen BC-Export, einsehbar nur fuer den zustaendigen DLR (nicht den
// Mandanten selbst, anders als bei RLP). Die Schnittstelle wurde von Erik
// (BC-Entwicklung) im Oktober 2026 freigegeben - vorher stand hier bewusst
// nur Zugriffsschutz + 503-Platzhalter.
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

  let file;
  try {
    file = await fetchBcExportFile(
      `isCurrent eq true and fileType eq 'xlsx' and companyName eq '${nr.replace(/'/g, "''")}'`,
    );
  } catch (err) {
    console.error("TG-Einzeldaten-XLSX-Abruf fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "TG-Einzeldaten-Export konnte nicht geladen werden." },
      { status: 502 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "Kein aktueller TG-Einzeldaten-Export für diesen Mandanten vorhanden." },
      { status: 404 },
    );
  }

  return new NextResponse(new Blob([file.buffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
