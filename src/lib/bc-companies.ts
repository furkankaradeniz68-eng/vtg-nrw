// Ersetzt verfahren-beispieldaten.ts: Verfahrens-Stammdaten kommen aus dem
// naechtlichen BC-Snapshot (siehe bc-sync.ts) statt aus einer hart codierten
// Liste. Anders als bei RLP liefert BC fuer NRW im Feld "dlr" durchgehend
// "0" (siehe MandantenZugangsdatenNRW.json) - die Bezirksregierungs-
// Zuordnung kommt stattdessen aus den ersten zwei Ziffern der
// vtgCompanyNo (Verfahrens-/Mandantennummer), bestaetigt durch
// DLR-Liste-NRW.xlsx (z.B. "06311" -> Praefix "06" -> Arnsberg).
import { cache } from "react";
import { get } from "@vercel/blob";
import { BLOB_TOKEN } from "@/lib/blob-token";
import { COMPANIES_PATHNAME, LAST_SYNC_PATHNAME, type BcSyncResult } from "@/lib/bc-sync";
import type { BcCompany } from "@/lib/bc-types";
import type { SessionRole } from "@/lib/auth";
import { getLatestFinancialYear } from "@/lib/bc-budget-lines";

export type Verfahren = {
  nr: string;
  name: string;
  dienstsitz: string;
  aktenzeichen: string;
  landkreis: string;
  hj: number;
  stand: string;
  chairperson: string;
  address: string;
  postCode: string;
  city: string;
};

// Praefix (erste zwei Ziffern der vtgCompanyNo) -> Bezirksregierung.
// `key` ist zugleich der Login-Benutzername des zustaendigen DLR-Accounts
// (siehe credentials.ts) und der interne Gruppierungsschluessel fuer
// istVerfahrenErreichbar() - `name` ist nur fuer die Anzeige.
const BEZIRKSREGIERUNG_ZIFFER: Record<string, { key: string; name: string }> = {
  "04": { key: "muenster", name: "Münster" },
  "05": { key: "koeln", name: "Köln" },
  "06": { key: "arnsberg", name: "Arnsberg" },
  "07": { key: "duesseldorf", name: "Düsseldorf" },
  "08": { key: "detmold", name: "Detmold" },
};

function bezirksregierungVon(vtgCompanyNo: string): { key: string; name: string } | undefined {
  return BEZIRKSREGIERUNG_ZIFFER[vtgCompanyNo.slice(0, 2)];
}

// React-Request-Memoization statt Modul-Level-Cache: eine warme Serverless-
// Instanz darf den Blob nicht ueber mehrere Requests hinweg cachen, sonst
// bleiben "Stand" & Co. nach einem erfolgreichen naechtlichen Sync trotzdem
// eingefroren, bis die Instanz irgendwann neu startet (siehe vtg-rlp,
// gleicher Bug dort urspruenglich mit Modul-Level-Cache).
const loadCompanies = cache(async (): Promise<BcCompany[]> => {
  const result = await get(COMPANIES_PATHNAME, { access: "private", token: BLOB_TOKEN }).catch(() => null);
  if (!result || result.statusCode !== 200) {
    throw new Error("BC-Firmendaten-Snapshot nicht gefunden — wurde der naechtliche Sync schon ausgefuehrt?");
  }
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as BcCompany[];
});

export function formatDateTime(dateTime: string): string {
  const d = new Date(dateTime);
  if (Number.isNaN(d.getTime())) return dateTime;
  const datePart = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Berlin" });
  const timePart = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  return `${datePart} ${timePart}`;
}

// Wird direkt aus dem Blob gelesen statt aus den Vercel Runtime-Logs, weil
// deren Aufbewahrung (Hobby-Plan) nur ca. 1 Stunde zurueckreicht - damit
// laesst sich im Admin-Dashboard jederzeit pruefen, ob der naechtliche Sync
// tatsaechlich gelaufen ist.
const loadLastSync = cache(async (): Promise<BcSyncResult | null> => {
  const result = await get(LAST_SYNC_PATHNAME, { access: "private", token: BLOB_TOKEN }).catch(() => null);
  if (!result || result.statusCode !== 200) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as BcSyncResult;
});

export async function getLastSync(): Promise<BcSyncResult | null> {
  return loadLastSync();
}

async function toVerfahren(company: BcCompany): Promise<Verfahren> {
  const bezirksregierung = bezirksregierungVon(company.vtgCompanyNo);
  const hj = (await getLatestFinancialYear(company.vtgCompanyNo)) ?? new Date().getFullYear();

  return {
    nr: company.vtgCompanyNo,
    name: company.name,
    dienstsitz: bezirksregierung?.name ?? "",
    // NRW hat (noch) keine Aktenzeichen-/Landkreis-Zusatzdaten wie RLP
    // (VERFAHREN_ERGAENZUNG) - bleibt leer, bis eine Quelle dafuer feststeht.
    aktenzeichen: "",
    landkreis: "",
    hj,
    stand: formatDateTime(company.snapshotDateTime),
    chairperson: company.chairperson,
    address: company.address,
    postCode: company.postCode,
    city: company.city,
  };
}

export async function getAllVerfahren(): Promise<Verfahren[]> {
  const companies = await loadCompanies();
  return Promise.all(companies.map(toVerfahren));
}

export async function findVerfahren(nr: string): Promise<Verfahren | undefined> {
  const companies = await loadCompanies();
  const company = companies.find((c) => c.vtgCompanyNo === nr);
  return company ? toVerfahren(company) : undefined;
}

export async function findBcCompanyByHomepageUsername(username: string): Promise<BcCompany | undefined> {
  if (!username) return undefined;
  const companies = await loadCompanies();
  return companies.find((c) => c.homepageUsername === username);
}

// Fuer die Downloads-Zuweisung im Admin-Bereich: alle Verfahren mit BC-Login
// (homepageUsername leer = kein Mandanten-Login, siehe BC-Feldmapping).
export async function listBcAbonnenten(): Promise<{ username: string; label: string }[]> {
  const companies = await loadCompanies();
  return companies
    .filter((c) => c.homepageUsername)
    .map((c) => ({ username: c.homepageUsername, label: c.name }));
}

export async function getVerfahrenByBezirksregierung(): Promise<Record<string, Verfahren[]>> {
  const companies = await loadCompanies();
  const acc: Record<string, Verfahren[]> = {};
  for (const company of companies) {
    const bezirksregierung = bezirksregierungVon(company.vtgCompanyNo);
    if (!bezirksregierung) continue;
    const verfahren = await toVerfahren(company);
    (acc[bezirksregierung.key] ??= []).push(verfahren);
  }
  return acc;
}

// Zugriffsregeln (analog zur urspruenglichen WP-Rollenlogik):
// Abonnent sieht nur die eigene Produktnummer (username == produkt_nr),
// DLR sieht nur Verfahren seiner Bezirksregierung (username == BEZIRKSREGIERUNG_ZIFFER[...].key),
// Admin hat vollen Zugriff.
export async function istVerfahrenErreichbar(
  session: { role: SessionRole; username: string },
  nr: string,
): Promise<boolean> {
  if (session.role === "admin") return true;
  if (session.role === "abonnent") {
    return nr === session.username;
  }
  const byBezirksregierung = await getVerfahrenByBezirksregierung();
  const eigene = byBezirksregierung[session.username] ?? [];
  return eigene.some((v) => v.nr === nr);
}
