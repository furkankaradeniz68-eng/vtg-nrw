// OAuth2-Client-Credentials-Flow gegen Business Central + generisches Paging
// ueber @odata.nextLink. Uebernommen aus vtg-rlp/src/lib/bc-client.ts - siehe
// dort fuer die Begruendung des Modul-Level-Token-Caches (unproblematisch,
// weil nur der naechtliche Sync-Job diesen Client aufruft, nicht jeder
// Seitenaufruf).
import { BC_TOKEN_URL, BC_SCOPE, BC_NRW_BASE_URL } from "@/lib/bc-config";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ist nicht gesetzt.`);
  return value;
}

type TokenCache = { accessToken: string; expiresAt: number };
let cachedToken: TokenCache | null = null;

async function fetchToken(): Promise<TokenCache> {
  const clientId = getEnv("BC_NRW_CLIENT_ID");
  const clientSecret = getEnv("BC_NRW_CLIENT_SECRET");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: BC_SCOPE,
  });

  const res = await fetch(BC_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    // Der Antwort-Body darf NIE in eine dem Aufrufer sichtbare Fehlermeldung
    // wandern: Azure AD spiegelt bei manchen Fehlern (z.B. AADSTS700016) den
    // von uns gesendeten client_id-Wert wortwoertlich zurueck - landet dort
    // versehentlich das Secret (z.B. durch Copy-Paste-Fehler in der
    // Env-Var), waere es sonst im API-Response/Log sichtbar. Nur serverseitig
    // loggen, dem Aufrufer nur den Status-Code zeigen.
    console.error(`BC-Token-Anfrage fehlgeschlagen: ${res.status} ${await res.text()}`);
    throw new Error(`BC-Token-Anfrage fehlgeschlagen: HTTP ${res.status} (Details im Server-Log)`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // 5 Minuten Sicherheitsabstand vor tatsaechlichem Ablauf.
  const expiresAt = Date.now() + (data.expires_in - 300) * 1000;
  return { accessToken: data.access_token, expiresAt };
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }
  cachedToken = await fetchToken();
  return cachedToken.accessToken;
}

type ODataResponse<T> = { value: T[]; "@odata.nextLink"?: string };

// Liest eine BC-Entity vollstaendig aus, inkl. Paging ueber @odata.nextLink
// (BC deckelt Antworten auf 20.000 Zeilen/Seite).
export async function fetchBcEntityAllPages<T>(entity: "vtgCompanies" | "vtgBudgetLines"): Promise<T[]> {
  const token = await getToken();
  const results: T[] = [];
  let url: string | undefined = `${BC_NRW_BASE_URL}/${entity}`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error(`BC-Abfrage fehlgeschlagen (${entity}): ${res.status} ${await res.text()}`);
      throw new Error(`BC-Abfrage fehlgeschlagen (${entity}): HTTP ${res.status} (Details im Server-Log)`);
    }
    const data = (await res.json()) as ODataResponse<T>;
    results.push(...data.value);
    url = data["@odata.nextLink"];
  }

  return results;
}
