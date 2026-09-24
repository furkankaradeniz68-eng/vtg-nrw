import Link from "next/link";
import PageHero from "@/components/PageHero";
import FinanzberichtTabelle from "@/components/FinanzberichtTabelle";
import { findVerfahren, istVerfahrenErreichbar } from "@/lib/bc-companies";
import { findeFinanzKategorie, KATEGORIE_INFO, type FinanzKategorieSlug } from "@/lib/bc-budget-lines";
import type { SessionPayload } from "@/lib/auth";

export default async function FinanzberichtSeite({
  kategorieSlug,
  ansicht,
  verfahrenId,
  session,
  laufzeitHref,
  haushaltsjahrHref,
}: {
  kategorieSlug: FinanzKategorieSlug;
  ansicht: "laufzeit" | "haushaltsjahr";
  verfahrenId?: string;
  session: SessionPayload;
  laufzeitHref: string;
  haushaltsjahrHref: string;
}) {
  const zugriffErlaubt = verfahrenId ? await istVerfahrenErreichbar(session, verfahrenId) : false;
  const verfahren = zugriffErlaubt && verfahrenId ? await findVerfahren(verfahrenId) : undefined;
  const kategorie = verfahren ? await findeFinanzKategorie(verfahren.nr, kategorieSlug, ansicht) : undefined;
  const ansichtLabel = ansicht === "laufzeit" ? "Laufzeit" : "Haushaltsjahr";
  const planLabel = ansicht === "laufzeit" ? "FinPL" : "Jahresprogramm";
  const info = KATEGORIE_INFO[kategorieSlug];
  const titel = kategorie?.titel ?? info.titel;
  const heroTitel = info.suffix ? `${info.titel}/${info.suffix}` : info.titel;

  return (
    <>
      <PageHero title={`${heroTitel} (${ansichtLabel})`} />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link
          href={`/mitgliederbereich/finanzuebersicht${verfahrenId ? `?id=${verfahrenId}` : ""}`}
          className="mb-6 inline-flex items-center gap-1.5 rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-vtg-orange hover:text-vtg-orange"
        >
          ‹ Zurück zur Finanzübersicht
        </Link>

        <h2 className="mb-4 font-heading text-2xl font-bold text-neutral-900">
          {titel} ({ansichtLabel})
        </h2>

        {verfahren && kategorie ? (
          <>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-neutral-700">
              <p>
                <strong className="text-neutral-900">{verfahren.nr}</strong> {verfahren.name}
              </p>
              <p>HJ: {verfahren.hj}</p>
              <p>Stand: {verfahren.stand}</p>
            </div>
            <p className="mb-6 text-sm text-neutral-700">
              {ansicht === "haushaltsjahr" ? (
                <>
                  <strong className="text-neutral-900">[Haushaltsjahr]</strong>{" "}
                  /{" "}
                  <Link href={laufzeitHref} className="text-vtg-orange hover:underline">
                    Laufzeit
                  </Link>
                </>
              ) : (
                <>
                  <Link href={haushaltsjahrHref} className="text-vtg-orange hover:underline">
                    Haushaltsjahr
                  </Link>{" "}
                  / <strong className="text-neutral-900">[Laufzeit]</strong>
                </>
              )}
            </p>
            <FinanzberichtTabelle planLabel={planLabel} zeilen={kategorie.zeilen} />
          </>
        ) : verfahrenId && !zugriffErlaubt ? (
          <p className="text-base leading-relaxed text-neutral-700">Kein Zugriff auf diese Daten.</p>
        ) : (
          <p className="text-base leading-relaxed text-neutral-700">
            Dieser Bericht wird mit den Echtzeit-Finanzdaten Ihres Verfahrens verknüpft,
            sobald die Anbindung an die BC-Schnittstelle steht.
          </p>
        )}
      </section>
    </>
  );
}
