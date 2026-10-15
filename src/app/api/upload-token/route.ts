import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";
import { BLOB_TOKEN } from "@/lib/blob-token";
import { MAX_DOWNLOAD_BYTES, UPLOAD_PREFIX } from "@/lib/download-pathname";

// Stellt dem Browser (nur eingeloggter Admin) ein kurzlebiges Token fuer den
// DIREKTEN Upload in den privaten Blob-Speicher aus. Dateien > 4,5 MB duerfen
// nicht durch eine Vercel-Funktion laufen (Request-Limit); die zugehoerige Route
// (z.B. /api/verfahren-downloads/upload) uebernimmt die Datei danach per Pfad.
export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      token: BLOB_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(UPLOAD_PREFIX)) {
          throw new Error("Ungültiger Zielpfad.");
        }
        return {
          maximumSizeInBytes: MAX_DOWNLOAD_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload nicht möglich." }, { status: 400 });
  }
}
