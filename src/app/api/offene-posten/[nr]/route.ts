import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { istVerfahrenErreichbar } from "@/lib/bc-companies";
import { fetchBcOpenLedgerFile } from "@/lib/bc-client";

export const maxDuration = 60;

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Liefert die Offene-Posten-Excel des angefragten Mandanten aus dem BC-Export
// (Entity openLedgerExportFiles). Bewusst nur fuer den zustaendigen DLR (und
// Admin), nicht fuer den Mandanten selbst: istVerfahrenErreichbar() beschraenkt
// einen DLR auf die Verfahren seiner Bezirksregierung (z.B. Arnsberg nur
// Mandanten mit Praefix 06). Deshalb holen wir immer nur die Einzeldatei des
// angefragten Mandanten und nicht das Gesamt-ZIP, das alle Bezirksregierungen
// enthielte.
export async function GET(_request: Request, { params }: { params: Promise<{ nr: string }> }) {
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
    file = await fetchBcOpenLedgerFile(
      `isCurrent eq true and fileType eq 'xlsx' and companyName eq '${nr.replace(/'/g, "''")}'`,
    );
  } catch (err) {
    console.error("Offene-Posten-XLSX-Abruf fehlgeschlagen:", err);
    return NextResponse.json({ error: "Offene Posten konnten nicht geladen werden." }, { status: 502 });
  }

  if (!file) {
    return NextResponse.json(
      { error: "Keine aktuellen Offenen Posten für diesen Mandanten vorhanden." },
      { status: 404 },
    );
  }

  return new NextResponse(new Blob([file.buffer]), {
    headers: {
      "Content-Type": file.contentType?.includes("/") ? file.contentType : XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
