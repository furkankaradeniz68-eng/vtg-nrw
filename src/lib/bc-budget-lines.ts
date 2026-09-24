// Ersetzt finanzbericht-beispieldaten.ts: Finanzpositionen kommen jetzt pro
// Verfahren aus dem naechtlichen BC-Snapshot (vtgBudgetLines), gruppiert nach
// Sachkonto-Praefix. Identisch zu vtg-rlp/src/lib/bc-budget-lines.ts -
// Soll-IstVergleich-NRW.json bestaetigt dieselben Kontogruppen-Praefixe.
//
// Kontogruppen-Zuordnung anhand der realen NRW-Beispieldaten bestaetigt:
//   Ausfuehrungskosten/A1        -> 411xxx - 416xxx
//   Sonstige Ausfuehrungskosten/A2 -> 422xx - 425xx
//   Einnahmen                    -> alle Konten, die mit "8" beginnen (811xx-891xx)
// Die Bilanzkonten (0730-1890) fuer die Finanzuebersicht-Kennzahlen
// (Kontostand/Forderungen/Vermoegen) sind wie bei RLP NICHT Teil der von BC
// gelieferten Feldspezifikation - bestmoeglicher Ableitungsversuch, sollte
// mit der Buchhaltung validiert werden, bevor produktiv angezeigt.
import { cache } from "react";
import { get } from "@vercel/blob";
import { BLOB_TOKEN } from "@/lib/blob-token";
import { BUDGET_LINES_PATHNAME } from "@/lib/bc-sync";
import type { BcBudgetLine } from "@/lib/bc-types";

export type FinanzZeile = {
  konto: string;
  ausgaben: number;
  plan: number;
  typ?: "gruppe" | "gesamt";
};

export type FinanzKategorie = {
  slug: string;
  titel: string;
  suffix?: string;
  zeilen: FinanzZeile[];
};

export type FinanzAnsicht = "laufzeit" | "haushaltsjahr";
export type FinanzKategorieSlug = "einnahmen" | "ausfuehrungskosten-a1" | "sonstige-ausfuehrungskosten-a2";

export const KATEGORIE_INFO: Record<FinanzKategorieSlug, { titel: string; suffix?: string }> = {
  einnahmen: { titel: "Einnahmen" },
  "ausfuehrungskosten-a1": { titel: "Ausführungskosten", suffix: "A1" },
  "sonstige-ausfuehrungskosten-a2": { titel: "Sonstige Ausführungskosten", suffix: "A2" },
};

function kategorieVonKonto(glAccountNo: string): FinanzKategorieSlug | undefined {
  const praefix3 = glAccountNo.slice(0, 3);
  if (["411", "412", "413", "414", "415", "416"].includes(praefix3)) return "ausfuehrungskosten-a1";
  if (["422", "423", "424", "425"].includes(praefix3)) return "sonstige-ausfuehrungskosten-a2";
  if (glAccountNo.startsWith("8")) return "einnahmen";
  return undefined;
}

// React-Request-Memoization statt Modul-Level-Cache: siehe Begruendung in
// bc-companies.ts (sonst bleiben die Finanzzahlen nach einem erfolgreichen
// naechtlichen Sync auf warmen Serverless-Instanzen trotzdem eingefroren).
const loadBudgetLines = cache(async (): Promise<BcBudgetLine[]> => {
  const result = await get(BUDGET_LINES_PATHNAME, { access: "private", token: BLOB_TOKEN }).catch(() => null);
  if (!result || result.statusCode !== 200) {
    throw new Error("BC-Finanzdaten-Snapshot nicht gefunden — wurde der naechtliche Sync schon ausgefuehrt?");
  }
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as BcBudgetLine[];
});

const loadByCompany = cache(async (): Promise<Map<string, BcBudgetLine[]>> => {
  const all = await loadBudgetLines();
  const byCompany = new Map<string, BcBudgetLine[]>();
  for (const row of all) {
    const list = byCompany.get(row.vtgCompanyNo);
    if (list) list.push(row);
    else byCompany.set(row.vtgCompanyNo, [row]);
  }
  return byCompany;
});

export async function getLatestFinancialYear(nr: string): Promise<number | undefined> {
  const byCompany = await loadByCompany();
  const rows = byCompany.get(nr);
  if (!rows || rows.length === 0) return undefined;
  return Math.max(...rows.map((r) => r.financialYear));
}

function summeZeile(konto: string, ausgaben: number, plan: number): FinanzZeile {
  return { konto, ausgaben, plan };
}

export async function findeFinanzKategorie(
  nr: string,
  slug: FinanzKategorieSlug,
  ansicht: FinanzAnsicht,
): Promise<FinanzKategorie> {
  const byCompany = await loadByCompany();
  const rows = (byCompany.get(nr) ?? []).filter((r) => kategorieVonKonto(r.glAccountNo) === slug);
  const jahr = await getLatestFinancialYear(nr);
  const aktuelleRows = jahr ? rows.filter((r) => r.financialYear === jahr) : rows;

  // Laufzeit: kumulierter Saldo (balance) vs. Laufzeitbudget (termBudget).
  // Haushaltsjahr: nur der Anteil des laufenden Jahres (balance minus
  // Vorjahresuebertrag) vs. Jahresprogramm (annualBudget).
  const werte = (row: BcBudgetLine): { ausgaben: number; plan: number } =>
    ansicht === "laufzeit"
      ? { ausgaben: row.balance, plan: row.termBudget }
      : { ausgaben: row.balance - row.carryOverPrevYear, plan: row.annualBudget };

  const gruppen = new Map<string, BcBudgetLine[]>();
  for (const row of aktuelleRows) {
    const gruppenSchluessel = row.glAccountNo.slice(0, 3);
    const list = gruppen.get(gruppenSchluessel);
    if (list) list.push(row);
    else gruppen.set(gruppenSchluessel, [row]);
  }

  const zeilen: FinanzZeile[] = [];
  let gesamtAusgaben = 0;
  let gesamtPlan = 0;

  for (const [gruppenSchluessel, gruppenRows] of [...gruppen.entries()].sort()) {
    let gruppenAusgaben = 0;
    let gruppenPlan = 0;
    const positionsZeilen: FinanzZeile[] = [];
    for (const row of [...gruppenRows].sort((a, b) => a.glAccountNo.localeCompare(b.glAccountNo))) {
      const { ausgaben, plan } = werte(row);
      gruppenAusgaben += ausgaben;
      gruppenPlan += plan;
      positionsZeilen.push(summeZeile(`${row.glAccountNo} ${row.glAccountName}`, ausgaben, plan));
    }
    zeilen.push({ konto: `Summe ${gruppenSchluessel}:`, ausgaben: gruppenAusgaben, plan: gruppenPlan, typ: "gruppe" });
    zeilen.push(...positionsZeilen);
    gesamtAusgaben += gruppenAusgaben;
    gesamtPlan += gruppenPlan;
  }

  zeilen.push({ konto: "Gesamtsumme", ausgaben: gesamtAusgaben, plan: gesamtPlan, typ: "gesamt" });

  const info = KATEGORIE_INFO[slug];
  return { slug, titel: info.titel, suffix: info.suffix, zeilen };
}

export async function gesamtsummeFuerKategorie(nr: string, slug: FinanzKategorieSlug): Promise<number> {
  // Fuer die Finanzuebersicht-Kachelsummen wird, wie im Original, die
  // kumulierte Laufzeit-Ansicht herangezogen.
  const kategorie = await findeFinanzKategorie(nr, slug, "laufzeit");
  return kategorie.zeilen.find((z) => z.typ === "gesamt")?.ausgaben ?? 0;
}

export type FinanzUebersichtKennzahlen = {
  kontostand: number;
  forderungenVerbindlichkeiten: number;
  forderungenVerbindlichkeitenBD: number;
  vermoegenDerTG: number;
};

const BILANZKONTEN = ["0730", "0800", "1000", "1200", "1360", "1400", "1500", "1590", "1600", "1800", "1890"];

export async function getFinanzUebersichtKennzahlen(nr: string): Promise<FinanzUebersichtKennzahlen> {
  const byCompany = await loadByCompany();
  const rows = byCompany.get(nr) ?? [];
  const jahr = await getLatestFinancialYear(nr);
  const aktuelleRows = jahr ? rows.filter((r) => r.financialYear === jahr) : rows;

  const saldoVon = (konto: string) =>
    aktuelleRows.filter((r) => r.glAccountNo === konto).reduce((sum, r) => sum + r.balance, 0);

  const kontostand = saldoVon("1200");
  const forderungenVerbindlichkeiten = saldoVon("1400") - saldoVon("1600");
  const vermoegenDerTG = BILANZKONTEN.reduce((sum, konto) => sum + saldoVon(konto), 0);

  return {
    kontostand,
    forderungenVerbindlichkeiten,
    // "BD" ist in der BC-Feldspezifikation nicht erklaert und laesst sich aus
    // der reinen Sachkonto-Liste nicht sicher ableiten — vorlaeufig 0, bis
    // BC-Entwicklung (Umut) das Konto/die Dimension dafuer benennt.
    forderungenVerbindlichkeitenBD: 0,
    vermoegenDerTG,
  };
}
