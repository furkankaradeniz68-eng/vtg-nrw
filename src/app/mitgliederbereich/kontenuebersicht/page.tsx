import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import DownloadList from "@/components/DownloadList";
import { requireSession } from "@/lib/auth";
import { findVerfahren, istVerfahrenErreichbar } from "@/lib/bc-companies";
import { getDownloadsForVerfahren } from "@/lib/verfahren-downloads";

export const metadata: Metadata = { title: "Kontenübersicht | VTG Nordrhein-Westfalen" };

export default async function KontenuebersichtPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await requireSession();
  const { id: rawId } = await searchParams;
  const id = rawId ?? (session.role === "abonnent" ? session.username : undefined);
  const zugriffErlaubt = id ? await istVerfahrenErreichbar(session, id) : false;
  const verfahren = zugriffErlaubt && id ? await findVerfahren(id) : undefined;
  const downloads = verfahren ? await getDownloadsForVerfahren(verfahren.nr, "kontenuebersicht") : [];

  return (
    <>
      <PageHero title="Kontenübersicht" />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {verfahren ? (
          <>
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
                Für dieses Verfahren wurden noch keine Kontoübersichten hinterlegt.
              </p>
            )}
          </>
        ) : id && !zugriffErlaubt ? (
          <p className="text-base leading-relaxed text-neutral-700">Kein Zugriff auf diese Daten.</p>
        ) : (
          <p className="text-base leading-relaxed text-neutral-700">
            Dieser Bereich wird mit den persönlichen Daten Ihres Verfahrens
            verknüpft, sobald der Mitgliederlogin freigeschaltet ist.
          </p>
        )}
      </section>
    </>
  );
}
