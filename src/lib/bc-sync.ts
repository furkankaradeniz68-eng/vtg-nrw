// Naechtlicher Batch-Import aus Business Central, identisches Muster wie
// vtg-rlp/src/lib/bc-sync.ts: Ein Cron-Job ruft syncBc() einmal taeglich auf,
// danach liest die gesamte Anwendung ausschliesslich aus diesem privaten
// Blob-Snapshot, nie live aus BC.
import { get, put } from "@vercel/blob";
import { BLOB_TOKEN } from "@/lib/blob-token";
import { fetchBcEntityAllPages } from "@/lib/bc-client";
import type { BcCompany, BcBudgetLine } from "@/lib/bc-types";

export const COMPANIES_PATHNAME = "bc/vtgCompanies.json";
export const BUDGET_LINES_PATHNAME = "bc/vtgBudgetLines.json";
export const LAST_SYNC_PATHNAME = "bc/last-sync.json";

async function saveSnapshot(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: BLOB_TOKEN,
  });
}

export type BcSyncResult = { companies: number; budgetLines: number; syncedAt: string };

async function ladeLetztenStand(): Promise<BcSyncResult | null> {
  const result = await get(LAST_SYNC_PATHNAME, { access: "private", useCache: false, token: BLOB_TOKEN }).catch(() => null);
  if (!result || result.statusCode !== 200) return null;
  return JSON.parse(await new Response(result.stream).text()) as BcSyncResult;
}

export async function syncBc(): Promise<BcSyncResult> {
  const [companies, budgetLines, vorher] = await Promise.all([
    fetchBcEntityAllPages<BcCompany>("vtgCompanies"),
    fetchBcEntityAllPages<BcBudgetLine>("vtgBudgetLines"),
    ladeLetztenStand(),
  ]);

  // Schutz vor leeren oder stark verkleinerten Antworten (z. B. waehrend BC neu aufbaut): lieber
  // den letzten guten Stand behalten und den Lauf als fehlgeschlagen melden, als die ganze
  // Homepage mit einem leeren Snapshot zu ueberschreiben.
  if (companies.length === 0 || budgetLines.length === 0) {
    throw new Error(`BC lieferte leere Daten (Mandanten: ${companies.length}, Budgetzeilen: ${budgetLines.length}); letzter Stand bleibt erhalten.`);
  }
  if (vorher && (companies.length < vorher.companies * 0.5 || budgetLines.length < vorher.budgetLines * 0.5)) {
    throw new Error(
      `BC lieferte deutlich weniger Daten als zuletzt (Mandanten ${companies.length} statt ${vorher.companies}, Budgetzeilen ${budgetLines.length} statt ${vorher.budgetLines}); letzter Stand bleibt erhalten.`,
    );
  }

  const result: BcSyncResult = {
    companies: companies.length,
    budgetLines: budgetLines.length,
    syncedAt: new Date().toISOString(),
  };

  await Promise.all([
    saveSnapshot(COMPANIES_PATHNAME, companies),
    saveSnapshot(BUDGET_LINES_PATHNAME, budgetLines),
    saveSnapshot(LAST_SYNC_PATHNAME, result),
  ]);

  return result;
}
