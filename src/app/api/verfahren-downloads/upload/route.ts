import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { addDownload, type DownloadCategory } from "@/lib/verfahren-downloads";
import { storeUpload } from "@/lib/direct-upload";

const CATEGORIES: DownloadCategory[] = ["kontenuebersicht", "kontoauszuege", "tg-einzeldaten"];

export async function POST(request: Request) {
  await requireAdminSession();

  const form = await request.formData();
  const verfahrenNr = form.get("verfahrenNr");
  const category = form.get("category");

  if (
    typeof verfahrenNr !== "string" ||
    !verfahrenNr ||
    typeof category !== "string" ||
    !CATEGORIES.includes(category as DownloadCategory)
  ) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const upload = await storeUpload(form, "file", {
    access: "private",
    legacyPathname: (name) => `verfahren-downloads/${id}-${name}`,
  });
  if (!upload) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  await addDownload({
    id,
    verfahrenNr,
    category: category as DownloadCategory,
    filename: upload.filename,
    blobPathname: upload.pathname,
    uploadedAt: new Date().toISOString(),
  });

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
