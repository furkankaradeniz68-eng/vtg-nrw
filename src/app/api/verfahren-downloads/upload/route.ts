import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdminSession } from "@/lib/auth";
import { addDownload, type DownloadCategory } from "@/lib/verfahren-downloads";
import { BLOB_TOKEN } from "@/lib/blob-token";

const CATEGORIES: DownloadCategory[] = ["kontenuebersicht", "kontoauszuege", "tg-einzeldaten"];

export async function POST(request: Request) {
  await requireAdminSession();

  const form = await request.formData();
  const verfahrenNr = form.get("verfahrenNr");
  const category = form.get("category");
  const file = form.get("file");

  if (
    typeof verfahrenNr !== "string" ||
    !verfahrenNr ||
    typeof category !== "string" ||
    !CATEGORIES.includes(category as DownloadCategory) ||
    !(file instanceof File)
  ) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const blobPathname = `verfahren-downloads/${id}-${file.name}`;

  const blob = await put(blobPathname, file, {
    access: "private",
    contentType: file.type || "application/octet-stream",
    addRandomSuffix: false,
    token: BLOB_TOKEN,
  });

  await addDownload({
    id,
    verfahrenNr,
    category: category as DownloadCategory,
    filename: file.name,
    blobPathname: blob.pathname,
    uploadedAt: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
