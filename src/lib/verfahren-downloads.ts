// Vom Admin einem Verfahren zugewiesene PDFs/ZIPs fuer Kontenuebersicht,
// Kontoauszuege und TG-Einzeldaten. Zugriff folgt derselben Regel wie die
// uebrigen Verfahrensdaten (istVerfahrenErreichbar in bc-companies.ts):
// der Abonnent des Verfahrens selbst sowie DLR/Admin mit Zugriff auf dieses
// Verfahren sehen dieselben Dateien. Anders als vtg-rlps downloads.ts (dort
// pro Login mit Ablaufdatum) gibt es hier bewusst kein Ablaufdatum, da es
// sich um dauerhafte Finanzunterlagen handelt statt um befristete
// Mitgliederrundschreiben.
import { put, del, get } from "@vercel/blob";
import { BLOB_TOKEN } from "@/lib/blob-token";

const META_PATHNAME = "verfahren-downloads-meta.json";

export type DownloadCategory = "kontenuebersicht" | "kontoauszuege" | "tg-einzeldaten";

export type VerfahrenDownloadEntry = {
  id: string;
  verfahrenNr: string;
  category: DownloadCategory;
  filename: string;
  blobPathname: string;
  uploadedAt: string;
};

// Keine Modul-weite Zwischenspeicherung: die Metadaten werden von der
// Anwendung selbst laufend veraendert (Upload/Loeschung), siehe
// bc-companies.ts fuer denselben Grund beim BC-Firmen-Snapshot.
async function loadEntries(): Promise<VerfahrenDownloadEntry[]> {
  const result = await get(META_PATHNAME, { access: "private", useCache: false, token: BLOB_TOKEN }).catch(
    () => null,
  );
  if (!result || result.statusCode !== 200) return [];
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as VerfahrenDownloadEntry[];
}

async function saveEntries(entries: VerfahrenDownloadEntry[]): Promise<void> {
  await put(META_PATHNAME, JSON.stringify(entries), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: BLOB_TOKEN,
  });
}

export async function getDownloadsForVerfahren(
  verfahrenNr: string,
  category: DownloadCategory,
): Promise<VerfahrenDownloadEntry[]> {
  const entries = await loadEntries();
  return entries.filter((e) => e.verfahrenNr === verfahrenNr && e.category === category);
}

export async function getAllDownloads(): Promise<VerfahrenDownloadEntry[]> {
  return loadEntries();
}

export async function getDownloadById(id: string): Promise<VerfahrenDownloadEntry | undefined> {
  const entries = await loadEntries();
  return entries.find((e) => e.id === id);
}

export async function addDownload(entry: VerfahrenDownloadEntry): Promise<void> {
  const entries = await loadEntries();
  entries.push(entry);
  await saveEntries(entries);
}

export async function removeDownload(id: string): Promise<void> {
  const entries = await loadEntries();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;
  await del(entry.blobPathname, { token: BLOB_TOKEN }).catch(() => {});
  await saveEntries(entries.filter((e) => e.id !== id));
}
