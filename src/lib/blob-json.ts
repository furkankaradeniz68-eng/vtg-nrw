// Laden der JSON-Daten, die die Anwendung selbst im privaten Blob-Speicher
// pflegt. Wie in vtg-rlp/src/lib/blob-json.ts: "Datei fehlt" und "Lesen
// fehlgeschlagen" sind zwei verschiedene Faelle. Wer anschliessend speichert,
// benutzt ladeBlobJson direkt (wirft bei einem Lesefehler), damit ein kurzer
// Aussetzer nicht alle vorhandenen Eintraege ueberschreibt. zurAnzeige() ist nur
// fuer reine Anzeigen und speichert nichts.
import { get } from "@vercel/blob";
import { BLOB_TOKEN } from "@/lib/blob-token";

async function leseText(pathname: string): Promise<string | undefined> {
  const result = await get(pathname, { access: "private", useCache: false, token: BLOB_TOKEN });
  // get() liefert nur bei 404 null, alle anderen Fehler werden geworfen.
  if (!result) return undefined;
  if (result.statusCode !== 200) throw new Error(`Blob ${pathname}: unerwarteter Status ${result.statusCode}`);
  return new Response(result.stream).text();
}

// undefined = Datei existiert nicht. Ein kurzer Aussetzer wird einmal wiederholt.
export async function ladeBlobJson<T>(pathname: string): Promise<T | undefined> {
  let text: string | undefined;
  try {
    text = await leseText(pathname);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 300));
    text = await leseText(pathname);
  }
  return text === undefined ? undefined : (JSON.parse(text) as T);
}

export async function zurAnzeige<T>(laden: () => Promise<T>, ersatz: T): Promise<T> {
  try {
    return await laden();
  } catch (error) {
    console.error("Blob-Daten nicht lesbar, zeige Ersatzwerte an (nichts gespeichert):", error);
    return structuredClone(ersatz);
  }
}
