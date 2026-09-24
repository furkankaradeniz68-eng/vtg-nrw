import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { requireSession } from "@/lib/auth";
import { istVerfahrenErreichbar } from "@/lib/bc-companies";
import { BLOB_TOKEN } from "@/lib/blob-token";
import { getDownloadById } from "@/lib/verfahren-downloads";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const entry = await getDownloadById(id);
  if (!entry) {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }

  const zugriffErlaubt = await istVerfahrenErreichbar(session, entry.verfahrenNr);
  if (!zugriffErlaubt) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const result = await get(entry.blobPathname, { access: "private", token: BLOB_TOKEN }).catch(() => null);
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${entry.filename.replace(/"/g, "")}"`,
    },
  });
}
