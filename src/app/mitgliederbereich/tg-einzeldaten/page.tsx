import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import DownloadList from "@/components/DownloadList";
import { requireInternSession } from "@/lib/auth";
import { findVerfahren, istVerfahrenErreichbar } from "@/lib/bc-companies";
import { getDownloadsForVerfahren } from "@/lib/verfahren-downloads";

export const metadata: Metadata = { title: "TG-Einzeldaten | VTG Nordrhein-Westfalen" };

export default async function TgEinzeldatenPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await requireInternSession();
  const { id } = await searchParams;
  const zugriffErlaubt = id ? await istVerfahrenErreichbar(session, id) : false;
  const verfahren = zugriffErlaubt && id ? await findVerfahren(id) : undefined;
  const downloads = verfahren ? await getDownloadsForVerfahren(verfahren.nr, "tg-einzeldaten") : [];

  return (
    <>
      <PageHero title="TG-Einzeldaten (ZIP)" />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {verfahren ? (
          <>
            <Link
              href="/mitgliederbereich/verfahrensauswahl"
              className="mb-6 inline-flex items-center gap-1.5 rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-vtg-orange hover:text-vtg-orange"
            >
              ‹ Zurück zur Verfahrensauswahl
            </Link>
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-neutral-700">
              <p>
                <strong className="text-neutral-900">{verfahren.nr}</strong> {verfahren.name}
              </p>
              <p>Stand: {verfahren.stand}</p>
            </div>
            {downloads.length > 0 ? (
              <DownloadList
                items={downloads.map((d) => ({
                  title: d.filename,
                  href: `/api/verfahren-downloads/${d.id}`,
                  meta: "Download",
                }))}
              />
            ) : (
              <p className="text-base leading-relaxed text-neutral-700">
                Für dieses Verfahren wurden noch keine TG-Einzeldaten hinterlegt.
              </p>
            )}
          </>
        ) : id && !zugriffErlaubt ? (
          <p className="text-base leading-relaxed text-neutral-700">Kein Zugriff auf diese Daten.</p>
        ) : (
          <p className="text-base leading-relaxed text-neutral-700">
            Bitte wählen Sie zunächst ein Verfahren in der Verfahrensauswahl aus.
          </p>
        )}
      </section>
    </>
  );
}
