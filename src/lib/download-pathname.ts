// Pfade und Grenzen fuer direkte Browser-Uploads in den Blob-Speicher.
// Dateien > 4,5 MB duerfen nicht durch eine Vercel-Funktion laufen
// (Request-Limit), daher laedt der Browser selbst hoch (siehe vtg-rlp). Wird vom
// Browser und vom Server identisch benutzt, daher ohne Server-only-Abhaengigkeiten.
export const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;

// Ab dieser Groesse laden die Admin-Formulare direkt hoch; kleinere Dateien
// gehen wie bisher im Formular mit (Vercel-Limit liegt bei ca. 4,5 MB).
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 3 * 1024 * 1024;

// Zwischenablage fuer direkte Uploads: uploads/{uuid}-{name}; die zugehoerige
// Route uebernimmt diesen Pfad unveraendert als Blob-Pfad des Eintrags.
export const UPLOAD_PREFIX = "uploads/";

export function uploadBlobPathname(id: string, filename: string): string {
  return `${UPLOAD_PREFIX}${id}-${filename.replace(/[\\/]/g, "_")}`;
}
