// Siehe vtg-rlp/src/lib/blob-token.ts: falls Vercel den Blob-Store beim
// Verbinden mit dem Projekt nicht unter dem von @vercel/blob erwarteten
// Standardnamen "BLOB_READ_WRITE_TOKEN" anlegt (z.B. wegen Region-Suffix),
// muss der abweichende Name hier ergaenzt werden. Fuer vtg-nrw noch offen,
// bis der Blob-Store an dieses Vercel-Projekt angebunden ist.
export const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_FRA_READ_WRITE_TOKEN;
