import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fetchBcOpenLedgerFile } from "@/lib/bc-client";

export const maxDuration = 60;

// Liefert das aktuelle Offene-Posten-Gesamt-ZIP (alle NRW-Mandanten) fuer
// DLR/Admin.
export async function GET() {
  const session = await requireSession();
  if (session.role !== "dlr" && session.role !== "admin") {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  let file;
  try {
    file = await fetchBcOpenLedgerFile("isCurrent eq true and fileType eq 'zip'");
  } catch (err) {
    console.error("Offene-Posten-ZIP-Abruf fehlgeschlagen:", err);
    return NextResponse.json({ error: "Offene Posten konnten nicht geladen werden." }, { status: 502 });
  }

  if (!file) {
    return NextResponse.json({ error: "Keine aktuellen Offenen Posten vorhanden." }, { status: 404 });
  }

  return new NextResponse(new Blob([file.buffer]), {
    headers: {
      "Content-Type": file.contentType?.includes("/") ? file.contentType : "application/zip",
      "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
