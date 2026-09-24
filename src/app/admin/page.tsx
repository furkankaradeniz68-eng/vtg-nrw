import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import SimpleTable from "@/components/SimpleTable";
import VerfahrenSearchSelect from "@/components/VerfahrenSearchSelect";
import { requireAdminSession } from "@/lib/auth";
import { getAllVerfahren } from "@/lib/bc-companies";
import { getAllDownloads, type DownloadCategory } from "@/lib/verfahren-downloads";

export const metadata: Metadata = { title: "Admin-Dashboard | VTG Nordrhein-Westfalen" };

const CATEGORY_LABEL: Record<DownloadCategory, string> = {
  kontenuebersicht: "Kontenübersicht",
  kontoauszuege: "Kontoauszüge",
  "tg-einzeldaten": "TG-Einzeldaten (ZIP)",
};

const inputClass = "w-full border border-neutral-300 px-3 py-2 text-sm focus:border-vtg-yellow focus:outline-none";
const primaryButtonClass = "bg-vtg-yellow px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-vtg-orange hover:text-white";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE");
}

export default async function AdminDashboardPage() {
  await requireAdminSession();

  const [verfahren, downloads] = await Promise.all([getAllVerfahren(), getAllDownloads()]);
  const verfahrenOptions = verfahren.map((v) => ({ nr: v.nr, name: v.name, dienstsitz: v.dienstsitz }));
  const verfahrenName = Object.fromEntries(verfahren.map((v) => [v.nr, v.name]));

  return (
    <>
      <PageHero title="Admin-Dashboard" />
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="mb-4 font-heading text-lg font-bold text-neutral-900">Neue Datei zuweisen</h2>
        <form
          action="/api/verfahren-downloads/upload"
          method="POST"
          encType="multipart/form-data"
          className="mb-12 flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">Verfahren</label>
            <VerfahrenSearchSelect verfahren={verfahrenOptions} name="verfahrenNr" />
          </div>
          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-neutral-800">
              Bereich
            </label>
            <select id="category" name="category" required className={inputClass}>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="file" className="mb-1 block text-sm font-medium text-neutral-800">
              Datei
            </label>
            <input id="file" name="file" type="file" required className={inputClass} />
          </div>
          <button type="submit" className={`mt-2 self-start ${primaryButtonClass}`}>
            Hochladen
          </button>
        </form>

        <h2 className="mb-4 font-heading text-lg font-bold text-neutral-900">Zugewiesene Dateien</h2>
        {downloads.length > 0 ? (
          <SimpleTable
            columns={["Verfahren", "Bereich", "Datei", "Hochgeladen", ""]}
            rows={downloads.map((d) => [
              `${verfahrenName[d.verfahrenNr] ?? "?"} (${d.verfahrenNr})`,
              CATEGORY_LABEL[d.category],
              d.filename,
              formatDate(d.uploadedAt),
              <form key={d.id} action="/api/verfahren-downloads/delete" method="POST">
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="text-sm text-red-600 hover:underline">
                  Löschen
                </button>
              </form>,
            ])}
          />
        ) : (
          <p className="text-base leading-relaxed text-neutral-700">Es sind noch keine Dateien zugewiesen.</p>
        )}
      </section>
    </>
  );
}
