// Ersetzt finanzbericht-beispieldaten.ts: Finanzpositionen kommen jetzt pro
// Verfahren aus dem naechtlichen BC-Snapshot (vtgBudgetLines), gruppiert nach
// Sachkonto-Praefix. Identisch zu vtg-rlp/src/lib/bc-budget-lines.ts -
// Soll-IstVergleich-NRW.json bestaetigt dieselben Kontogruppen-Praefixe.
//
// Kontogruppen-Zuordnung anhand der realen NRW-Beispieldaten bestaetigt:
//   Ausfuehrungskosten/A1        -> 411xxx - 416xxx
//   Sonstige Ausfuehrungskosten/A2 -> 422xx - 425xx
//   Einnahmen                    -> alle Konten, die mit "8" beginnen (811xx-891xx)
// Die Bilanzkonten-Formel fuer die Finanzuebersicht-Kennzahlen (Kontostand/
// Forderungen-Verbindlichkeiten/Vermoegen der TG) ist seit 2026-10-09 fuer RLP
// und NRW identisch (Kundenwunsch: gilt fuer jede Finanzuebersicht); sie wurde
// am 2026-10-07 mit dem Kunden vor Ort fuer RLP validiert, 1401/1600/1601
// kamen am 2026-10-09 dazu:
//   Kontostand                     = Saldo(1200)
//   Forderungen/Verbindlichkeiten  = Saldo(1400) + Saldo(1401) + Saldo(1590)
//                                    + Saldo(1600) + Saldo(1601)
//   Forderungen/Verbindlichkeiten BD = Saldo(1591)
//   Vermoegen der TG               = Kontostand + Forderungen/Verbindlichkeiten
//                                     + Forderungen/Verbindlichkeiten BD
//
// Download-Berichte (findeFinanzDownloadKategorie), PDF-Generierung
// (finanzbericht-pdf.ts) und die Einnahmen-Vorzeichen-Logik sind 2026-10-07
// 1:1 aus vtg-rlp/src/lib/bc-budget-lines.ts uebernommen worden (gleicher
// Kundenwunsch, gleiche Kontogruppen-Struktur). Die Positionszeilen-Merge-
// Sonderfaelle (z.B. "41530" in drei Teilbereich-Varianten) wurden dort
// anhand echter RLP-Referenz-PDFs verifiziert; der Algorithmus selbst
// (gruppenNachBasisOderBeschreibung) ist generisch und wirkt sich nur dann
// aus, wenn NRW-Konten dasselbe Muster zeigen.
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

// Bewusst ohne Modul-Level-Cache und ohne React `cache()` — siehe Begruendung
// in vtg-rlp/src/lib/bc-budget-lines.ts: `cache()` scoped nicht zuverlaessig
// in Route Handlern (z.B. /api/finanzbericht/pdf, die mit diesem Feature neu
// dazukommt) und kann dort einen einmal haengenden Promise dauerhaft auf
// einer warmen Serverless-Instanz festhalten.
async function loadBudgetLines(): Promise<BcBudgetLine[]> {
  const result = await get(BUDGET_LINES_PATHNAME, { access: "private", token: BLOB_TOKEN }).catch(() => null);
  if (!result || result.statusCode !== 200) {
    throw new Error("BC-Finanzdaten-Snapshot nicht gefunden — wurde der naechtliche Sync schon ausgefuehrt?");
  }
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as BcBudgetLine[];
}

async function loadByCompany(): Promise<Map<string, BcBudgetLine[]>> {
  const all = await loadBudgetLines();
  const byCompany = new Map<string, BcBudgetLine[]>();
  for (const row of all) {
    const list = byCompany.get(row.vtgCompanyNo);
    if (list) list.push(row);
    else byCompany.set(row.vtgCompanyNo, [row]);
  }
  return byCompany;
}

export async function getLatestFinancialYear(nr: string): Promise<number | undefined> {
  const byCompany = await loadByCompany();
  const rows = byCompany.get(nr);
  if (!rows || rows.length === 0) return undefined;
  return Math.max(...rows.map((r) => r.financialYear));
}

function summeZeile(konto: string, ausgaben: number, plan: number): FinanzZeile {
  return { konto, ausgaben, plan };
}

function jahrAusRows(rows: BcBudgetLine[]): number | undefined {
  if (rows.length === 0) return undefined;
  return Math.max(...rows.map((r) => r.financialYear));
}

// Fuer Detail-Seiten (Finanzuebersicht/Finanzbericht), die fuer dasselbe
// Verfahren mehrere Kategorien/Kennzahlen auf einmal brauchen: laedt den
// Budget-Lines-Blob genau einmal und liefert nur die Zeilen der gewuenschten
// Firma. Aufrufer koennen das Ergebnis an findeFinanzKategorie/
// getFinanzUebersichtKennzahlen als `vorgeladeneRows` durchreichen, statt
// dass jede dieser Funktionen den kompletten Blob selbst erneut abruft.
export async function getBudgetLinesForCompany(nr: string): Promise<BcBudgetLine[]> {
  const byCompany = await loadByCompany();
  return byCompany.get(nr) ?? [];
}

export async function findeFinanzKategorie(
  nr: string,
  slug: FinanzKategorieSlug,
  ansicht: FinanzAnsicht,
  vorgeladeneRows?: BcBudgetLine[],
): Promise<FinanzKategorie> {
  const alleRows = vorgeladeneRows ?? (await getBudgetLinesForCompany(nr));
  const rows = alleRows.filter((r) => kategorieVonKonto(r.glAccountNo) === slug);
  // Jahr wird aus denselben, bereits geladenen Zeilen abgeleitet statt ueber
  // einen zweiten getLatestFinancialYear()-Aufruf (der intern wieder den
  // kompletten Blob neu laden wuerde).
  const jahr = jahrAusRows(alleRows);
  const aktuelleRows = jahr ? rows.filter((r) => r.financialYear === jahr) : rows;

  // Laufzeit: kumulierter Saldo (balance) vs. Laufzeitbudget (termBudget).
  // Haushaltsjahr: nur der Anteil des laufenden Jahres (balance minus
  // Vorjahresuebertrag) vs. Jahresprogramm (annualBudget).
  //
  // Vorzeichen-Korrektur fuer Einnahmen: BC fuehrt Ertragskonten (alle "8"-
  // Konten) auf der Haben-Seite, ihr Saldo kommt aus der OData-Schnittstelle
  // daher naturgemaess negativ. Ausfuehrungskosten (Aufwand, Soll-Konten)
  // sind davon nicht betroffen und bleiben unveraendert. Kundenwunsch (wie
  // bei RLP): in der Finanzuebersicht-Kachel sollen Einnahmen positiv
  // angezeigt werden.
  const vorzeichenFaktor = slug === "einnahmen" ? -1 : 1;
  const werte = (row: BcBudgetLine): { ausgaben: number; plan: number } =>
    ansicht === "laufzeit"
      ? { ausgaben: vorzeichenFaktor * row.balance, plan: vorzeichenFaktor * row.termBudget }
      : {
          ausgaben: vorzeichenFaktor * (row.balance - row.carryOverPrevYear),
          plan: vorzeichenFaktor * row.annualBudget,
        };

  // Einnahmen-Konten (811xx-891xx) werden 2-stellig gruppiert (81, 82, ...
  // statt 811, 812, ...) — bei Ausfuehrungskosten/Sonstige Ausfuehrungskosten
  // bleibt die bisherige 3-stellige Gruppierung.
  const gruppenStellen = slug === "einnahmen" ? 2 : 3;
  const gruppen = new Map<string, BcBudgetLine[]>();
  for (const row of aktuelleRows) {
    const gruppenSchluessel = row.glAccountNo.slice(0, gruppenStellen);
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

  // A1-Download: zwei abgeleitete Zeilen, die sich zuverlaessig aus
  // vorhandenen BC-Feldern ableiten lassen. Plan = Ausgaben, da es fuer diese
  // abgeleiteten Zeilen keinen eigenen Plan-Wert in BC gibt — so zeigt die
  // Differenz-Spalte neutral 0,00 statt eines erfundenen Werts.
  if (slug === "ausfuehrungskosten-a1") {
    const nichtZuwendungsfaehig =
      ansicht === "laufzeit"
        ? aktuelleRows.reduce((summe, row) => summe + row.notEligibleFinYear, 0)
        : aktuelleRows.reduce((summe, row) => summe + (row.notEligibleFinYear - row.notEligiblePrevYear), 0);
    const zuwendungsfaehig = gesamtAusgaben - nichtZuwendungsfaehig;
    zeilen.push({ konto: "Nicht zuwendungsfähige AK (Plan)", ausgaben: nichtZuwendungsfaehig, plan: nichtZuwendungsfaehig, typ: "gesamt" });
    zeilen.push({ konto: "Zuwendungsfähige AK", ausgaben: zuwendungsfaehig, plan: zuwendungsfaehig, typ: "gesamt" });
  }

  const info = KATEGORIE_INFO[slug];
  return { slug, titel: info.titel, suffix: info.suffix, zeilen };
}

// ---------------------------------------------------------------------------
// Download-Berichte (Ausfuehrungskosten A1/A2, Einnahmen) — 1:1 aus
// vtg-rlp/src/lib/bc-budget-lines.ts uebernommen (Soll-Ist-Vergleich mit
// Diff%, nicht zuwendungsfaehiger AK und "Summe BD (8.3)").
//
// Bewusst eine EIGENE Funktion neben findeFinanzKategorie() — nicht als
// Ersatz: findeFinanzKategorie() bleibt unveraendert fuer die Finanzuebersicht
// -Kachel (gesamtsummeFuerKategorie), dort werden Einnahmen weiterhin positiv
// angezeigt. Hier (Download-Seite UND daraus erzeugtes PDF) gilt das NICHT:
// Einnahmen werden roh/negativ gefuehrt (Kundenwunsch, wie bei RLP: "Es soll
// nur im Download/PDF minus zeigen, bei der Live-Seite bleibt es positiv").
// Siehe vorzeichenFaktor weiter unten (bewusst konstant 1, kein Dreher fuer
// Einnahmen).
// ---------------------------------------------------------------------------

export type FinanzDownloadSpalten = {
  ausgaben: number;
  nichtZuFaehig: number | null;
  plan: number | null;
  diffEur: number | null;
  diffProz: number | null;
};

export type FinanzDownloadZeile = {
  konto: string;
  typ?: "gruppe" | "gesamt" | "sonder";
  laufzeit: FinanzDownloadSpalten;
  haushaltsjahr: FinanzDownloadSpalten;
};

export type FinanzDownloadKategorie = {
  slug: FinanzKategorieSlug;
  titel: string;
  suffix?: string;
  // true = Ausfuehrungskosten A1 (volle 5-Spalten-Soll-Ist-Tabelle je Seite).
  // false = A2/Einnahmen (nur der rohe Ausgaben-Betrag je Seite, kein Plan/
  // Diff im Original vorhanden).
  vollSpalten: boolean;
  zeilen: FinanzDownloadZeile[];
};

function leereSpalten(ausgaben: number): FinanzDownloadSpalten {
  return { ausgaben, nichtZuFaehig: null, plan: null, diffEur: null, diffProz: null };
}

function diffProzent(plan: number, diffEur: number): number {
  return plan !== 0 ? (diffEur / plan) * 100 : 0;
}

// Haushaltsjahr-Diff%-Maskierung (wie bei RLP): auf allen Zwischensummen-/
// Positionszeilen wird ein positiver oder neutraler Prozentwert als "0,0"
// ausgewiesen, ein negativer Wert bleibt sichtbar. Nur auf den beiden
// finalen Zeilen (Gesamtsumme, Zuwendungsfaehige AK) wird immer der echte
// Wert gezeigt, auch wenn er positiv ist. Die Laufzeit-Seite wird NIE
// maskiert (ruft diese Funktion also gar nicht auf).
function maskiertesHaushaltsjahrProzent(diffProz: number): number {
  return diffProz >= 0 ? 0 : diffProz;
}

// Laengster gemeinsamer Praefix mehrerer Kontonummern — bestimmt die Ziffern-
// Anzeige fuer eine zusammengefasste Positionszeile (z.B. "412101".."412109"
// -> "41210"). Haben alle Zeilen einer Gruppe dieselbe Nummer (Einzelzeile,
// kein echtes Zusammenfassen), wird trotzdem die letzte Ziffer (der
// Teilbereich-Code: 1=AG, 2=D, 3=L, 4=W, 5=WD, 6=WS, 8=EU, 9=U) abgeschnitten,
// da dieser im Original nie auf Einzelkonto-Ebene gezeigt wird.
function laengsterGemeinsamerPraefix(codes: string[]): string {
  let praefix = codes[0];
  for (const code of codes.slice(1)) {
    let i = 0;
    while (i < praefix.length && i < code.length && praefix[i] === code[i]) i++;
    praefix = praefix.slice(0, i);
  }
  if (praefix.length >= codes[0].length && praefix.length > 1) {
    return praefix.slice(0, -1);
  }
  return praefix;
}

// Basis-Kontonummer ohne den letzten Ziffern-Teilbereichscode (1=AG, 2=D,
// 3=L, 4=W, 5=WD, 6=WS, 8=EU, 9=U), z.B. "415301" -> "41530".
function basisKonto(code: string): string {
  return code.length > 1 ? code.slice(0, -1) : code;
}

// Fasst Positionszeilen zu Gruppen zusammen, wenn sie ENTWEDER dieselbe
// Basis-Kontonummer (ohne Teilbereichscode) ODER dieselbe bereinigte
// Beschreibung (Text vor dem ersten "/" in glAccountName) teilen — per
// Union-Find, da beide Kriterien bei RLP unabhaengig voneinander am alten
// vtg-rlp.de verifiziert wurden:
//  - Gleiche Basisnummer, unterschiedliche Beschreibung: z.B. 415301/
//    415302/415303 sind in BC je Teilbereich minimal unterschiedlich (und
//    manchmal abweichend abgeschnitten) betitelt, zeigen im Original aber
//    eine einzige Zeile.
//  - Gleiche Beschreibung, unterschiedliche Basisnummer: manche Konten
//    teilen sich dieselbe Bezeichnung trotz unterschiedlicher Basisnummer
//    und werden im Original ebenfalls zu einer Zeile zusammengefasst.
// Die angezeigte Beschreibung einer Gruppe ist die der Zeile mit der
// kleinsten Kontonummer (meist der Teilbereich AG, entspricht i.d.R. der
// Original-Bezeichnung ohne Abschneide-Variante).
function gruppenNachBasisOderBeschreibung(rows: BcBudgetLine[]): BcBudgetLine[][] {
  const parent = rows.map((_, i) => i);
  function find(i: number): number {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    let cur = i;
    while (parent[cur] !== root) {
      const next = parent[cur];
      parent[cur] = root;
      cur = next;
    }
    return root;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  const ersterIndexJeBasis = new Map<string, number>();
  const ersterIndexJeBeschreibung = new Map<string, number>();
  rows.forEach((row, i) => {
    const basis = basisKonto(row.glAccountNo);
    const beschreibung = (row.glAccountName.split("/")[0] ?? row.glAccountName).trim();
    const basisIndex = ersterIndexJeBasis.get(basis);
    if (basisIndex !== undefined) union(basisIndex, i);
    else ersterIndexJeBasis.set(basis, i);
    const beschreibungIndex = ersterIndexJeBeschreibung.get(beschreibung);
    if (beschreibungIndex !== undefined) union(beschreibungIndex, i);
    else ersterIndexJeBeschreibung.set(beschreibung, i);
  });

  const gruppenNachWurzel = new Map<number, BcBudgetLine[]>();
  rows.forEach((row, i) => {
    const wurzel = find(i);
    const list = gruppenNachWurzel.get(wurzel);
    if (list) list.push(row);
    else gruppenNachWurzel.set(wurzel, [row]);
  });
  return [...gruppenNachWurzel.values()];
}

export async function findeFinanzDownloadKategorie(
  nr: string,
  slug: FinanzKategorieSlug,
  vorgeladeneRows?: BcBudgetLine[],
): Promise<FinanzDownloadKategorie> {
  const alleRows = vorgeladeneRows ?? (await getBudgetLinesForCompany(nr));
  const jahr = jahrAusRows(alleRows);
  const rowsImJahr = jahr ? alleRows.filter((r) => r.financialYear === jahr) : alleRows;

  const kategorieRows = rowsImJahr.filter((r) => kategorieVonKonto(r.glAccountNo) === slug);
  const vollSpalten = slug === "ausfuehrungskosten-a1";

  // Vorzeichen-Korrektur NUR in der Finanzuebersicht (findeFinanzKategorie),
  // NICHT im Download/PDF: BC fuehrt Ertragskonten ("8xxx") auf der
  // Haben-Seite, ihr Saldo kommt aus der OData-Schnittstelle daher
  // naturgemaess negativ. Im Download/PDF soll das roh/negativ bleiben, nur
  // die Finanzuebersicht-Kachel soll positiv anzeigen. Deshalb hier KEIN
  // Vorzeichen-Dreher fuer Einnahmen (Faktor immer 1), im Unterschied zu
  // findeFinanzKategorie() oben.
  const vorzeichenFaktor = 1;
  const ausgabenL = (row: BcBudgetLine) => vorzeichenFaktor * row.balance;
  const ausgabenHj = (row: BcBudgetLine) => vorzeichenFaktor * (row.balance - row.carryOverPrevYear);
  const planL = (row: BcBudgetLine) => vorzeichenFaktor * row.termBudget;
  const planHj = (row: BcBudgetLine) => vorzeichenFaktor * row.annualBudget;
  const nichtZuFaehigL = (row: BcBudgetLine) => vorzeichenFaktor * row.notEligibleFinYear;
  const nichtZuFaehigHj = (row: BcBudgetLine) => vorzeichenFaktor * (row.notEligibleFinYear - row.notEligiblePrevYear);

  // Gruppierung: 3-stellig fuer A1/A2, 2-stellig fuer Einnahmen — mit
  // Sonderfall Konto "9000" (Saldenuebernahme Sachkonten), das in die Gruppe
  // "89" einsortiert wird statt in eine eigene Gruppe "90".
  const gruppenSchluessel = (glAccountNo: string): string => {
    if (slug === "einnahmen") {
      if (glAccountNo.startsWith("9000")) return "89";
      return glAccountNo.slice(0, 2);
    }
    return glAccountNo.slice(0, 3);
  };

  const gruppen = new Map<string, BcBudgetLine[]>();
  for (const row of kategorieRows) {
    const schluessel = gruppenSchluessel(row.glAccountNo);
    const list = gruppen.get(schluessel);
    if (list) list.push(row);
    else gruppen.set(schluessel, [row]);
  }

  const zeilen: FinanzDownloadZeile[] = [];
  let gesamtAusgabenL = 0;
  let gesamtPlanL = 0;
  let gesamtAusgabenHj = 0;
  let gesamtPlanHj = 0;

  for (const [schluessel, gruppenRows] of [...gruppen.entries()].sort()) {
    let gL = 0;
    let pL = 0;
    let gHj = 0;
    let pHj = 0;
    const positionsZeilen: FinanzDownloadZeile[] = [];

    // Positionszeilen werden nach Basis-Kontonummer ODER bereinigter
    // Beschreibung zusammengefasst (siehe gruppenNachBasisOderBeschreibung
    // oben). Die angezeigte Kontonummer ist der laengste gemeinsame
    // Ziffern-Praefix der zusammengefassten Konten. Diff% wird auf dieser
    // Ebene im Original nicht ausgewiesen (nur bei Summe-/Gesamtzeilen).
    const positionsListe = gruppenNachBasisOderBeschreibung(gruppenRows).map((posRows) => {
      const sortierteRows = [...posRows].sort((a, b) => a.glAccountNo.localeCompare(b.glAccountNo));
      const beschreibung = (sortierteRows[0].glAccountName.split("/")[0] ?? sortierteRows[0].glAccountName).trim();
      return { beschreibung, posRows: sortierteRows, minCode: sortierteRows[0].glAccountNo };
    });
    positionsListe.sort((a, b) => a.minCode.localeCompare(b.minCode));

    for (const { beschreibung, posRows } of positionsListe) {
      let aL = 0;
      let aHj = 0;
      let plL = 0;
      let plHj = 0;
      let nzL = 0;
      let nzHj = 0;
      for (const row of posRows) {
        aL += ausgabenL(row);
        aHj += ausgabenHj(row);
        plL += planL(row);
        plHj += planHj(row);
        nzL += nichtZuFaehigL(row);
        nzHj += nichtZuFaehigHj(row);
      }
      gL += aL;
      pL += plL;
      gHj += aHj;
      pHj += plHj;

      const posSchluessel = laengsterGemeinsamerPraefix(posRows.map((r) => r.glAccountNo));

      if (vollSpalten) {
        positionsZeilen.push({
          konto: `${posSchluessel} ${beschreibung}`,
          laufzeit: { ausgaben: aL, nichtZuFaehig: nzL, plan: plL, diffEur: plL - aL, diffProz: null },
          haushaltsjahr: { ausgaben: aHj, nichtZuFaehig: nzHj, plan: plHj, diffEur: plHj - aHj, diffProz: null },
        });
      } else {
        positionsZeilen.push({
          konto: `${posSchluessel} ${beschreibung}`,
          laufzeit: leereSpalten(aL),
          haushaltsjahr: leereSpalten(aHj),
        });
      }
    }

    if (vollSpalten) {
      const nzL = gruppenRows.reduce((summe, row) => summe + nichtZuFaehigL(row), 0);
      const nzHj = gruppenRows.reduce((summe, row) => summe + nichtZuFaehigHj(row), 0);
      const diffEurL = pL - gL;
      const diffEurHj = pHj - gHj;
      zeilen.push({
        konto: `Summe ${schluessel}`,
        typ: "gruppe",
        laufzeit: { ausgaben: gL, nichtZuFaehig: nzL, plan: pL, diffEur: diffEurL, diffProz: diffProzent(pL, diffEurL) },
        haushaltsjahr: {
          ausgaben: gHj,
          nichtZuFaehig: nzHj,
          plan: pHj,
          diffEur: diffEurHj,
          diffProz: maskiertesHaushaltsjahrProzent(diffProzent(pHj, diffEurHj)),
        },
      });
    } else {
      zeilen.push({ konto: `Summe ${schluessel}`, typ: "gruppe", laufzeit: leereSpalten(gL), haushaltsjahr: leereSpalten(gHj) });
    }
    zeilen.push(...positionsZeilen);

    gesamtAusgabenL += gL;
    gesamtPlanL += pL;
    gesamtAusgabenHj += gHj;
    gesamtPlanHj += pHj;
  }

  if (vollSpalten) {
    const gesamtNzL = kategorieRows.reduce((summe, row) => summe + nichtZuFaehigL(row), 0);
    const gesamtNzHj = kategorieRows.reduce((summe, row) => summe + nichtZuFaehigHj(row), 0);
    const gDiffEurL = gesamtPlanL - gesamtAusgabenL;
    const gDiffEurHj = gesamtPlanHj - gesamtAusgabenHj;

    zeilen.push({
      konto: "Gesamtsumme",
      typ: "gesamt",
      laufzeit: {
        ausgaben: gesamtAusgabenL,
        nichtZuFaehig: gesamtNzL,
        plan: gesamtPlanL,
        diffEur: gDiffEurL,
        diffProz: diffProzent(gesamtPlanL, gDiffEurL),
      },
      haushaltsjahr: {
        ausgaben: gesamtAusgabenHj,
        nichtZuFaehig: gesamtNzHj,
        plan: gesamtPlanHj,
        diffEur: gDiffEurHj,
        diffProz: diffProzent(gesamtPlanHj, gDiffEurHj), // finale Zeile: NIE maskiert
      },
    });

    // "Nicht zuwendungsfaehige AK (Plan)": nur Ausgaben + Diff(=0,00)
    // sichtbar, FinPl/nicht-zu.fae/% bleiben leer (Original-PDF) — es gibt
    // dafuer keinen eigenen Planwert in BC.
    zeilen.push({
      konto: "Nicht zuwendungsfähige AK (Plan)",
      typ: "sonder",
      laufzeit: { ausgaben: gesamtNzL, nichtZuFaehig: null, plan: null, diffEur: 0, diffProz: null },
      haushaltsjahr: { ausgaben: gesamtNzHj, nichtZuFaehig: null, plan: null, diffEur: 0, diffProz: null },
    });

    // "Summe BD (8.3)": Saldo der Einnahmen-Gruppe 83xxx, als Abzugsposten bei
    // den Ausfuehrungskosten. Diff/% werden auf dieser Zeile im Original nicht
    // ausgewiesen.
    // Vorzeichen (wie bei RLP am Original-PDF verifiziert): der Ausgaben-Wert
    // (balance-basiert) ist auf der Einnahmen-Seite roh negativ gefuehrt und
    // muss daher gedreht werden. Die Plan-Werte (termBudget/annualBudget)
    // sind in BC dagegen bereits POSITIV gespeichert und duerfen NICHT
    // gedreht werden.
    const einnahmenRows = rowsImJahr.filter(
      (row) => kategorieVonKonto(row.glAccountNo) === "einnahmen" && row.glAccountNo.startsWith("83"),
    );
    const bdAusgabenL = -einnahmenRows.reduce((summe, row) => summe + ausgabenL(row), 0);
    const bdAusgabenHj = -einnahmenRows.reduce((summe, row) => summe + ausgabenHj(row), 0);
    const bdPlanL = einnahmenRows.reduce((summe, row) => summe + planL(row), 0);
    const bdPlanHj = einnahmenRows.reduce((summe, row) => summe + planHj(row), 0);
    zeilen.push({
      konto: "Summe BD (8.3)",
      typ: "sonder",
      laufzeit: { ausgaben: bdAusgabenL, nichtZuFaehig: null, plan: bdPlanL, diffEur: null, diffProz: null },
      haushaltsjahr: { ausgaben: bdAusgabenHj, nichtZuFaehig: null, plan: bdPlanHj, diffEur: null, diffProz: null },
    });

    // "Zuwendungsfaehige AK" = Gesamtsumme − nicht zuwendungsfaehige AK − BD.
    // Auf der FinPl/Jahresprogramm-Seite traegt "nicht zuwendungsfaehig"
    // NICHT bei (kein eigener Planwert in BC) — dort wird nur BD abgezogen.
    // Auf der Ausgaben-Seite wird nicht-zu-fae. dagegen sehr wohl abgezogen.
    const zAusgabenL = gesamtAusgabenL - gesamtNzL - bdAusgabenL;
    const zAusgabenHj = gesamtAusgabenHj - gesamtNzHj - bdAusgabenHj;
    const zPlanL = gesamtPlanL - bdPlanL;
    const zPlanHj = gesamtPlanHj - bdPlanHj;
    const zDiffEurL = zPlanL - zAusgabenL;
    const zDiffEurHj = zPlanHj - zAusgabenHj;
    zeilen.push({
      konto: "Zuwendungsfähige AK",
      typ: "gesamt",
      laufzeit: {
        ausgaben: zAusgabenL,
        nichtZuFaehig: null,
        plan: zPlanL,
        diffEur: zDiffEurL,
        diffProz: diffProzent(zPlanL, zDiffEurL),
      },
      haushaltsjahr: {
        ausgaben: zAusgabenHj,
        nichtZuFaehig: null,
        plan: zPlanHj,
        diffEur: zDiffEurHj,
        diffProz: diffProzent(zPlanHj, zDiffEurHj), // finale Zeile: NIE maskiert
      },
    });
  } else {
    zeilen.push({
      konto: "Gesamtsumme",
      typ: "gesamt",
      laufzeit: leereSpalten(gesamtAusgabenL),
      haushaltsjahr: leereSpalten(gesamtAusgabenHj),
    });
  }

  const info = KATEGORIE_INFO[slug];
  return { slug, titel: info.titel, suffix: info.suffix, vollSpalten, zeilen };
}

export async function gesamtsummeFuerKategorie(
  nr: string,
  slug: FinanzKategorieSlug,
  vorgeladeneRows?: BcBudgetLine[],
): Promise<number> {
  // Fuer die Finanzuebersicht-Kachelsummen wird, wie im Original, die
  // kumulierte Laufzeit-Ansicht herangezogen.
  const kategorie = await findeFinanzKategorie(nr, slug, "laufzeit", vorgeladeneRows);
  return kategorie.zeilen.find((z) => z.typ === "gesamt")?.ausgaben ?? 0;
}

export type FinanzUebersichtKennzahlen = {
  kontostand: number;
  forderungenVerbindlichkeiten: number;
  forderungenVerbindlichkeitenBD: number;
  vermoegenDerTG: number;
};

// Formel identisch zu vtg-rlp/src/lib/bc-budget-lines.ts (dort mit Begruendung
// fuer 1401 und die Verbindlichkeiten 1600/1601).
export async function getFinanzUebersichtKennzahlen(
  nr: string,
  vorgeladeneRows?: BcBudgetLine[],
): Promise<FinanzUebersichtKennzahlen> {
  const rows = vorgeladeneRows ?? (await getBudgetLinesForCompany(nr));
  const jahr = jahrAusRows(rows);
  const aktuelleRows = jahr ? rows.filter((r) => r.financialYear === jahr) : rows;

  const saldoVon = (konto: string) =>
    aktuelleRows.filter((r) => r.glAccountNo === konto).reduce((sum, r) => sum + r.balance, 0);

  const kontostand = saldoVon("1200");
  const forderungenVerbindlichkeiten =
    saldoVon("1400") + saldoVon("1401") + saldoVon("1590") + saldoVon("1600") + saldoVon("1601");
  const forderungenVerbindlichkeitenBD = saldoVon("1591");
  const vermoegenDerTG = kontostand + forderungenVerbindlichkeiten + forderungenVerbindlichkeitenBD;

  return {
    kontostand,
    forderungenVerbindlichkeiten,
    forderungenVerbindlichkeitenBD,
    vermoegenDerTG,
  };
}
