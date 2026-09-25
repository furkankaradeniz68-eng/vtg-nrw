// Naechtlicher Batch-Import aus Business Central, identisches Muster wie
// vtg-rlp/src/lib/bc-sync.ts: Ein Cron-Job ruft syncBc() einmal taeglich auf,
// danach liest die gesamte Anwendung ausschliesslich aus diesem privaten
// Blob-Snapshot, nie live aus BC.
import { put } from "@vercel/blob";
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

export async function syncBc(): Promise<BcSyncResult> {
  const [companies, budgetLines] = await Promise.all([
    fetchBcEntityAllPages<BcCompany>("vtgCompanies"),
    fetchBcEntityAllPages<BcBudgetLine>("vtgBudgetLines"),
  ]);

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
