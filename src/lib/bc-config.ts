// Konstanten fuer die Business-Central-Schnittstelle (NRW). Tenant-ID und
// Company-GUID sind mit vtg-rlp/src/lib/bc-config.ts identisch bestaetigt
// (siehe @odata.context in den von BC-Entwicklung gelieferten Beispiel-
// Responses MandantenZugangsdatenNRW.json / Soll-IstVergleich-NRW.json) -
// RLP und NRW teilen sich denselben BC-Mandanten, unterschieden nur durch
// das URL-Pfadsegment (api/vtg/nrw/v1.0 statt api/vtg/rlp/v1.0) und das
// Feld "interfaceCode" ("NRW" statt "RLP") auf jedem Datensatz. Die
// Client-ID/-Secret (Env-Vars BC_NRW_CLIENT_ID/BC_NRW_CLIENT_SECRET) sind
// davon unabhaengig und muessen weiterhin separat in Vercel gesetzt werden.
const TENANT_ID = "80690875-b516-45ad-ae52-ec1368023c4e";
const COMPANY_ID = "dba7ad6b-ce51-f011-be59-0022485d4e72";

export const BC_TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
export const BC_SCOPE = "https://api.businesscentral.dynamics.com/.default";
export const BC_NRW_BASE_URL = `https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/Production/api/vtg/nrw/v1.0/companies(${COMPANY_ID})`;
