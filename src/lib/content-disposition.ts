// Content-Disposition fuer Datei-Downloads. Dateinamen aus Admin-Uploads
// (oder BC) duerfen nicht ungeprueft in den Header geschrieben werden: Ein
// Name mit Zeichen ausserhalb von Latin-1 laesst schon das Anlegen des Headers
// mit "Cannot convert argument to a ByteString" scheitern, die Route
// antwortet dann mit HTTP 500 und leerem Body. Das passiert typischerweise bei
// auf dem Mac gespeicherten Dateien, deren Umlaute zerlegt (NFD) vorliegen
// ("Ä" = "A" + U+0308) - so war am 2026-10-12 die Satzung "6 Satzung
// 28.04.2026 (6. Änderung).pdf" nicht mehr herunterladbar.
//
// Ergebnis: ASCII-Fallback fuer alte Clients plus filename* (RFC 5987/6266)
// mit dem echten UTF-8-Namen fuer alle aktuellen Browser.
export function contentDisposition(filename: string, type: "attachment" | "inline" = "attachment"): string {
  const name = filename.normalize("NFC").replace(/[\r\n"\\]/g, "");
  const ascii = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
