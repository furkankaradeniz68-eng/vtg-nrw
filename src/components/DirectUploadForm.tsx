"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { DIRECT_UPLOAD_THRESHOLD_BYTES, MAX_DOWNLOAD_BYTES, uploadBlobPathname } from "@/lib/download-pathname";

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}

// Formular fuer Admin-Seiten mit Datei-Upload. Grosse Dateien (> 3 MB) werden
// vor dem Absenden direkt vom Browser in den Blob-Speicher geladen, weil
// Vercel-Funktionen nur ca. 4,5 MB pro Anfrage annehmen; das Formular wird danach
// ohne Datei, aber mit den Feldern `{name}__pathname` / `{name}__filename`
// abgeschickt (siehe storeUpload in src/lib/direct-upload.ts). Kleine Dateien
// laufen unveraendert im Formular mit. Ob ein Datei-Feld oeffentlich ist
// (Bilder), steht in data-access="public"; Standard ist privat.
export default function DirectUploadForm({
  children,
  ...formProps
}: React.FormHTMLAttributes<HTMLFormElement> & { children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (busy) {
      e.preventDefault();
      return;
    }
    const form = e.currentTarget;
    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="file"]')).filter(
      (i) => (i.files?.[0]?.size ?? 0) > DIRECT_UPLOAD_THRESHOLD_BYTES,
    );
    if (inputs.length === 0) return; // normaler Submit

    e.preventDefault();
    const tooBig = inputs.find((i) => (i.files?.[0]?.size ?? 0) > MAX_DOWNLOAD_BYTES);
    if (tooBig?.files?.[0]) {
      setError(`Die Datei ist mit ${formatMb(tooBig.files[0].size)} zu groß (maximal ${formatMb(MAX_DOWNLOAD_BYTES)}).`);
      return;
    }

    setBusy(true);
    setError("");
    setProgress(0);
    try {
      for (const input of inputs) {
        const file = input.files![0];
        const result = await upload(uploadBlobPathname(crypto.randomUUID(), file.name), file, {
          access: input.dataset.access === "public" ? "public" : "private",
          handleUploadUrl: "/api/upload-token",
          multipart: file.size > 50 * 1024 * 1024,
          contentType: file.type || "application/octet-stream",
          onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
        });
        for (const [suffix, value] of [
          ["__pathname", result.pathname],
          ["__filename", file.name],
        ]) {
          const hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = `${input.name}${suffix}`;
          hidden.value = value;
          form.appendChild(hidden);
        }
        input.value = ""; // Datei nicht noch einmal im Formular mitschicken
      }
      HTMLFormElement.prototype.submit.call(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <form {...formProps} onSubmit={handleSubmit}>
      {children}
      {busy && (
        <div className="mt-2 w-full" aria-live="polite">
          <div className="h-2 w-full overflow-hidden rounded bg-neutral-200">
            <div className="h-full bg-vtg-yellow transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Datei wird hochgeladen … {progress} %. Bitte das Fenster nicht schließen.
          </p>
        </div>
      )}
      {error && <p className="mt-2 w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
