import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { SessionRole } from "@/lib/auth";
import { findBcCompanyByHomepageUsername } from "@/lib/bc-companies";

type DlrCredential = { username: string; passwordHash: string; dlrNr: string };
type AdminCredential = { username: string; passwordHash: string };

// Abonnent-Logins kommen (wie bei vtg-rlp) live aus dem BC-Snapshot
// (homepageUsername/homepagePassword, siehe bc-companies.ts), nicht mehr aus
// dieser Datei. DLR und Admin sind in den BC-Daten nicht enthalten und
// bleiben auf dem bcrypt/CREDENTIALS_JSON-System (DLR-Werte aus
// DLR-Liste-NRW.xlsx, siehe credentials-nrw.ts / Setup-Notiz).
type CredentialsData = {
  dlr: DlrCredential[];
  admin: AdminCredential[];
};

let cached: CredentialsData | null = null;

function loadCredentials(): CredentialsData {
  if (cached) return cached;
  const raw = process.env.CREDENTIALS_JSON;
  if (!raw) throw new Error("CREDENTIALS_JSON ist nicht gesetzt.");
  // Base64-encoded: bcrypt hashes contain `$`, which Next's .env loader
  // (dotenv-expand) otherwise treats as a variable reference and strips.
  cached = JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as CredentialsData;
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

export type VerifiedUser = { role: SessionRole; username: string } | null;

export async function verifyCredentials(username: string, password: string): Promise<VerifiedUser> {
  const creds = loadCredentials();
  const name = username.trim();

  const admin = creds.admin.find((a) => a.username === name);
  if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
    return { role: "admin", username: admin.username };
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
