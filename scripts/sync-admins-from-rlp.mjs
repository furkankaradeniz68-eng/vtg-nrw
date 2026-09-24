// Übernimmt die VTG-Intern-Admins (ADD.RLP, vtggs, vtgnews) aus vtg-rlp in
// die CREDENTIALS_JSON von vtg-nrw — per bereits gehashtem passwordHash, es
// wird dabei nie ein Klartext-Passwort gelesen oder ausgegeben.
//
// Voraussetzung: Die aktuell in Vercel hinterlegte CREDENTIALS_JSON von
// vtg-nrw liegt lokal in .env.local vor (z. B. per `vercel env pull .env.local`
// im vtg-nrw-Repo abgeholt).
//
// Nutzung (im vtg-nrw-Repo):
//   node scripts/sync-admins-from-rlp.mjs
//
// Das Script schreibt die aktualisierte base64-CREDENTIALS_JSON nach
// nrw-credentials.local.output.txt (gitignored) — den Inhalt als neuen Wert
// für die Env-Var CREDENTIALS_JSON im Vercel-Projekt "nrw-vtg" eintragen.
// Datei danach löschen.

import fs from "node:fs";

const RLP_ENV_PATH = "/Users/fk/Developer/vtg-rlp/.env.local";
const NRW_ENV_PATH = ".env.local";
const ADMIN_USERNAMES_TO_SYNC = ["ADD.RLP", "vtggs", "vtgnews"];

function readCredentialsJson(envPath) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  const idx = lines.findIndex((l) => l.startsWith("CREDENTIALS_JSON="));
  if (idx === -1) throw new Error(`CREDENTIALS_JSON nicht gefunden in ${envPath}`);
  const b64 = lines[idx].slice("CREDENTIALS_JSON=".length);
  return { creds: JSON.parse(Buffer.from(b64, "base64").toString("utf-8")), lines, idx };
}

const { creds: rlpCreds } = readCredentialsJson(RLP_ENV_PATH);
const rlpAdmins = rlpCreds.admin.filter((a) => ADMIN_USERNAMES_TO_SYNC.includes(a.username));
if (rlpAdmins.length !== ADMIN_USERNAMES_TO_SYNC.length) {
  const found = rlpAdmins.map((a) => a.username);
  const missing = ADMIN_USERNAMES_TO_SYNC.filter((u) => !found.includes(u));
  throw new Error(`Admin(s) in vtg-rlp nicht gefunden: ${missing.join(", ")}`);
}

const { creds: nrwCreds, lines: nrwLines, idx: nrwIdx } = readCredentialsJson(NRW_ENV_PATH);

for (const rlpAdmin of rlpAdmins) {
  const existingIdx = nrwCreds.admin.findIndex((a) => a.username === rlpAdmin.username);
  if (existingIdx >= 0) {
    nrwCreds.admin[existingIdx].passwordHash = rlpAdmin.passwordHash;
  } else {
    nrwCreds.admin.push({ username: rlpAdmin.username, passwordHash: rlpAdmin.passwordHash });
  }
}

const newB64 = Buffer.from(JSON.stringify(nrwCreds)).toString("base64");
const outputPath = "nrw-credentials.local.output.txt";
fs.writeFileSync(outputPath, newB64 + "\n");

console.log(`Admins übernommen: ${ADMIN_USERNAMES_TO_SYNC.join(", ")}`);
console.log(`admin gesamt: ${nrwCreds.admin.length}, dlr: ${nrwCreds.dlr?.length ?? 0}, abonnent: ${nrwCreds.abonnent?.length ?? 0}`);
console.log(`Base64-Wert geschrieben nach: ${outputPath}`);
console.log(`Diesen Inhalt als neuen Wert für CREDENTIALS_JSON im Vercel-Projekt "nrw-vtg" eintragen.`);
console.log(`Danach ${outputPath} löschen.`);
