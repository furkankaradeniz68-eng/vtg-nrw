import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { SessionRole } from "@/lib/auth";
import { findBcCompanyByHomepageUsername } from "@/lib/bc-companies";

type DlrCredential = { username: string; passwordHash: string; dlrNr: string };
type AdminCredential = { username: string; passwordHash: string };
type DlrAlleCredential = { username: string; passwordHash: string };

// Abonnent-Logins kommen (wie bei vtg-rlp) live aus dem BC-Snapshot
// (homepageUsername/homepagePassword, siehe bc-companies.ts), nicht mehr aus
// dieser Datei. DLR und Admin sind in den BC-Daten nicht enthalten und
// bleiben auf dem bcrypt/CREDENTIALS_JSON-System (DLR-Werte aus
// DLR-Liste-NRW.xlsx, siehe credentials-nrw.ts / Setup-Notiz).
type CredentialsData = {
  dlr: DlrCredential[];
  admin: AdminCredential[];
  // Interne Logins mit DLR-Rechten (kein Admin), aber Sicht auf alle Mandanten.
  dlrAlle: DlrAlleCredential[];
};

// Optionale zweite Env-Variable CREDENTIALS_INTERN_JSON (gleiches base64-Format,
// Felder admin, dlrAlle und/oder dlr). Eintraege in dlr ueberschreiben gleichnamige
// Bezirksregierungs-Logins aus CREDENTIALS_JSON (z.B. nach einer Passwortaenderung). So lassen sich die internen VTG-Logins
// pflegen, ohne die (nicht auslesbare) CREDENTIALS_JSON mit den
// Bezirksregierungs-Logins neu aufbauen zu muessen. Logins in dlrAlle sind
// kein Admin mehr: gleichnamige Eintraege aus CREDENTIALS_JSON.admin entfallen.
type InternCredentialsData = { admin?: AdminCredential[]; dlrAlle?: DlrAlleCredential[]; dlr?: DlrCredential[] };

let cached: CredentialsData | null = null;

function loadCredentials(): CredentialsData {
  if (cached) return cached;
  const raw = process.env.CREDENTIALS_JSON;
  if (!raw) throw new Error("CREDENTIALS_JSON ist nicht gesetzt.");
  // Base64-encoded: bcrypt hashes contain `$`, which Next's .env loader
  // (dotenv-expand) otherwise treats as a variable reference and strips.
  const basis = JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as Omit<CredentialsData, "dlrAlle"> &
    Partial<Pick<CredentialsData, "dlrAlle">>;

  const internRaw = process.env.CREDENTIALS_INTERN_JSON;
  const intern: InternCredentialsData = internRaw
    ? (JSON.parse(Buffer.from(internRaw, "base64").toString("utf-8")) as InternCredentialsData)
    : {};

  const dlrAlle = [...(basis.dlrAlle ?? []), ...(intern.dlrAlle ?? [])];
  const dlrAlleNamen = new Set(dlrAlle.map((d) => d.username));
  const neueAdmins = intern.admin ?? [];
  const neueAdminNamen = new Set(neueAdmins.map((a) => a.username));
  const admin = [
    ...basis.admin.filter((a) => !dlrAlleNamen.has(a.username) && !neueAdminNamen.has(a.username)),
    ...neueAdmins,
  ];

  const neueDlr = intern.dlr ?? [];
  const neueDlrNamen = new Set(neueDlr.map((d) => d.username));
  const dlr = [...basis.dlr.filter((d) => !neueDlrNamen.has(d.username)), ...neueDlr];

  cached = { dlr, admin, dlrAlle };
  return cached;
}

// BC liefert Passwoerter im Klartext (keine Hashes), daher Vergleich per
// SHA-256-Digest + timingSafeEqual statt bcrypt.compare — verhindert sowohl
// Timing-Angriffe als auch ein Laengen-Leak durch den Klartext-Vergleich.
function timingSafePlaintextEqual(a: string, b: string): boolean {
  const aHash = crypto.createHash("sha256").update(a).digest();
  const bHash = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

export type VerifiedUser = { role: SessionRole; username: string; alleMandanten?: boolean } | null;

export async function verifyCredentials(username: string, password: string): Promise<VerifiedUser> {
  const creds = loadCredentials();
  const name = username.trim();

  const admin = creds.admin.find((a) => a.username === name);
  if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
    return { role: "admin", username: admin.username };
  }

  const dlrAlle = creds.dlrAlle.find((d) => d.username === name);
  if (dlrAlle && (await bcrypt.compare(password, dlrAlle.passwordHash))) {
    return { role: "dlr", username: dlrAlle.username, alleMandanten: true };
  }

  const dlr = creds.dlr.find((d) => d.username === name);
  if (dlr && (await bcrypt.compare(password, dlr.passwordHash))) {
    return { role: "dlr", username: dlr.username };
  }

  const bcCompany = await findBcCompanyByHomepageUsername(name);
  if (bcCompany && bcCompany.homepagePassword && timingSafePlaintextEqual(password, bcCompany.homepagePassword)) {
    return { role: "abonnent", username: bcCompany.homepageUsername };
  }

  return null;
}
