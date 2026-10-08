import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { requireSession } from "@/lib/auth";
import { findVerfahren, istVerfahrenErreichbar } from "@/lib/bc-companies";

export const metadata: Metadata = { title: "Offene Posten | VTG Nordrhein-Westfalen" };

const downloadButtonClass =
  "inline-block bg-vtg-yellow px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-vtg-orange hover:text-white";

export default async function OffenePostenPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await requireSession();
  const { id: rawId } = await searchParams;
  const id = rawId ?? (session.role === "abonnent" ? session.username : undefined);
  const zugriffErlaubt = id ? await istVerfahrenErreichbar(session, id) : false;
  const verfahren = zugriffErlaubt && id ? await findVerfahren(id) : undefined;
  const istIntern = session.role === "dlr" || session.role === "admin";

  return (
    <>
      <PageHero title="Offene Posten" />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {verfahren ? (
          <>
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-neutral-700">
              <p>
                <strong className="text-neutral-900">{verfahren.nr}</strong> {verfahren.name}
              </p>
              <p>Stand: {verfahren.stand}</p>
            </div>
            <a href={`/api/offene-posten/${verfahren.nr}`} className={downloadButtonClass}>
              Offene Posten herunterladen (Excel)
            </a>
          </>
        ) : id && !zugriffErlaubt ? (
          <p className="text-base leading-relaxed text-neutral-700">Kein Zugriff auf diese Daten.</p>
        ) : (
          <p className="text-base leading-relaxed text-neutral-700">
            {istIntern
              ? "Bitte wählen Sie in der Verfahrensauswahl ein Verfahren aus, um dessen Offene Posten herunterzuladen."
              : "Dieser Bereich wird mit den persönlichen Daten Ihres Verfahrens verknüpft, sobald der Mitgliederlogin freigeschaltet ist."}
          </p>
        )}

        {istIntern && (
          <div className={verfahren ? "mt-4" : "mt-8"}>
            {/* Datei-Download, kein Seitenwechsel - next/link wuerde hier eine RSC-Antwort erwarten */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/offene-posten/zip"
              className="inline-block border border-vtg-orange px-4 py-2 text-sm font-medium text-vtg-orange hover:bg-vtg-orange hover:text-white"
            >
              Alle Offenen Posten herunterladen (ZIP)
            </a>
          </div>
        )}
      </section>
    </>
  );
}
