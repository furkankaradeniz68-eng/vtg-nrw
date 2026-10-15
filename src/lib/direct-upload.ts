import { put, head } from "@vercel/blob";
import { BLOB_TOKEN } from "@/lib/blob-token";
import { UPLOAD_PREFIX } from "@/lib/download-pathname";

export type StoredUpload = {
  pathname: string;
  url: string;
  filename: string;
  contentType: string;
};

// Liest eine Datei aus einem Admin-Formular. Zwei Wege:
// - Grosse Dateien hat der Browser bereits direkt in den Blob-Speicher geladen
//   (siehe DirectUploadForm); das Formular enthaelt dann nur die Felder
//   `{field}__pathname` und `{field}__filename`. Pfad und Existenz werden hier
//   geprueft, die Datei selbst laeuft nicht durch die Funktion.
// - Kleine Dateien kommen wie bisher im Formular mit und werden unter
//   `legacyPathname(dateiname)` abgelegt.
// Gibt null zurueck, wenn keine Datei mitgeschickt wurde.
export async function storeUpload(
  form: FormData,
  field: string,
  opts: { access: "public" | "private"; legacyPathname: (filename: string) => string },
): Promise<StoredUpload | null> {
  const direct = form.get(`${field}__pathname`);
  if (typeof direct === "string" && direct) {
    if (!direct.startsWith(UPLOAD_PREFIX) || direct.includes("..")) {
      throw new Error("Ungültiger Upload-Pfad.");
    }
    const blob = await head(direct, { token: BLOB_TOKEN }).catch(() => null);
    if (!blob) throw new Error("Die hochgeladene Datei wurde nicht gefunden.");
    const name = form.get(`${field}__filename`);
    return {
      pathname: blob.pathname,
      url: blob.url,
      filename: typeof name === "string" && name ? name : blob.pathname.split("/").pop() ?? blob.pathname,
      contentType: blob.contentType,
    };
  }

  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  const blob = await put(opts.legacyPathname(file.name), file, {
    access: opts.access,
    contentType: file.type || "application/octet-stream",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: BLOB_TOKEN,
  });
  return {
    pathname: blob.pathname,
    url: blob.url,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  };
}
