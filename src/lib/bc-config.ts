// TODO(NRW-BC-Anbindung): Platzhalter, noch NICHT einsatzbereit.
// Analog zu vtg-rlp/src/lib/bc-config.ts, aber NRW braucht eine eigene
// Tenant-ID und Company-GUID (eigene Azure-AD-App-Registrierung + eigenes
// BC-Environment). Sobald der BC-Entwickler die NRW-Zugangsdaten liefert,
// hier eintragen und BC_NRW_BASE_URL-Pfadsegment pruefen (bei RLP lautet er
// ".../api/vtg/rlp/v1.0/..." - fuer NRW vermutlich ".../api/vtg/nrw/v1.0/...",
// aber unbedingt mit BC-Entwicklung bestaetigen statt zu raten).
const TENANT_ID = "TODO_NRW_TENANT_ID";
const COMPANY_ID = "TODO_NRW_COMPANY_ID";

export const BC_TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
export const BC_SCOPE = "https://api.businesscentral.dynamics.com/.default";
export const BC_NRW_BASE_URL = `https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/Production/api/vtg/nrw/v1.0/companies(${COMPANY_ID})`;
