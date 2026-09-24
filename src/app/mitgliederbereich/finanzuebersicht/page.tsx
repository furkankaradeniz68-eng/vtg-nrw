import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import { requireSession } from "@/lib/auth";
import { findVerfahren, istVerfahrenErreichbar } from "@/lib/bc-companies";
import {
  gesamtsummeFuerKategorie,
  getFinanzUebersichtKennzahlen,
  type FinanzKategorieSlug,
} from "@/lib/bc-budget-lines";

export const metadata: Metadata = { title: "Finanzübersicht | VTG Nordrhein-Westfalen" };

const berichte: { titel: string; href: string; kategorieSlug: FinanzKategorieSlug }[] = [
  {
    titel: "Ausführungskosten/A1",
    href: "ausfuehrungskosten-a1-haushaltsjahr",
    kategorieSlug: "ausfuehrungskosten-a1",
  },
  {
    titel: "Sonstige Ausführungskosten/A2",
    href: "sonstige-ausfuehrungskosten-a2-haushaltsjahr",
    kategorieSlug: "sonstige-ausfuehrungskosten-a2",
  },
  { titel: "Einnahmen", href: "einnahmen-haushaltsjahr", kategorieSlug: "einnahmen" },
];

function formatEuro(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function FinanzuebersichtPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await requireSession();
  const { id: rawId } = await searchParams;
  const id = rawId ?? (session.role === "abonnent" ? session.username : undefined);
  const zugriffErlaubt = id ? await istVerfahrenErreichbar(session, id) : false;
  const verfahren = zugriffErlaubt && id ? await findVerfahren(id) : undefined;
  const k = verfahren ? await getFinanzUebersichtKennzahlen(verfahren.nr) : undefined;
  const gesamtsummen: Partial<Record<FinanzKategorieSlug, number>> = verfahren
    ? Object.fromEntries(
        await Promise.all(
          berichte.map(
            async (b) => [b.kategorieSlug, await gesamtsummeFuerKategorie(verfahren.nr, b.kategorieSlug)] as const,
          ),
        ),
      )
    : {};

  return (
    <>
      <PageHero title="Finanzübersicht" />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {verfahren ? (
          <>
            <Link
              href={`/mitgliederbereich/verfahrensdaten?id=${verfahren.nr}`}
              className="mb-6 inline-flex items-center gap-1.5 rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:border-vtg-orange hover:text-vtg-orange"
            >
              ‹ Zurück zu Verfahrensdaten
            </Link>

            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-neutral-700">
              <p>
                <strong className="text-neutral-900">{verfahren.nr}</strong> {verfahren.name}
              </p>
              <p>HJ: {verfahren.hj}</p>
              <p>Stand: {verfahren.stand}</p>
            </div>

            <div className="mt-6 flex flex-col divide-y divide-neutral-100 text-sm text-neutral-700">
              <div className="flex justify-between py-1.5">
                <span>Produktnummer:</span>
                <span className="font-medium text-neutral-900">{verfahren.nr}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Verfahren:</span>
                <span className="font-medium text-neutral-900">{verfahren.name}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Bezirksregierung:</span>
                <span className="font-medium text-neutral-900">{verfahren.dienstsitz}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Kontostand:</span>
                <span className="font-medium text-neutral-900">{formatEuro(k!.kontostand)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Forderungen / Verbindlichkeiten:</span>
                <span className="font-medium text-neutral-900">
                  {formatEuro(k!.forderungenVerbindlichkeiten)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Forderungen / Verbindlichkeiten BD:</span>
                <span className="font-medium text-neutral-900">
                  {formatEuro(k!.forderungenVerbindlichkeitenBD)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Vermögen der TG</span>
                <span className="font-medium text-neutral-900">{formatEuro(k!.vermoegenDerTG)}</span>
              </div>
            </div>

            <ul className="mt-8 flex flex-col gap-2">
              {berichte.map((bericht) => (
                <li key={bericht.href}>
                  <Link
                    href={`/mitgliederbereich/${bericht.href}?id=${verfahren.nr}`}
                    className="flex overflow-hidden text-sm font-medium transition hover:brightness-95"
                  >
                    <span className="flex-1 bg-vtg-yellow px-4 py-2.5 text-neutral-900">
                      {bericht.titel}:
                    </span>
                    <span className="w-32 shrink-0 bg-vtg-orange px-4 py-2.5 text-right text-white">
                      {formatEuro(gesamtsummen[bericht.kategorieSlug] ?? 0)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : id && !zugriffErlaubt ? (
          <p className="text-base leading-relaxed text-neutral-700">Kein Zugriff auf diese Daten.</p>
        ) : (
          <p className="text-base leading-relaxed text-neutral-700">
            Dieser Bereich wird mit den persönlichen Finanzdaten Ihres Verfahrens
            verknüpft, sobald der Mitgliederlogin freigeschaltet ist.
          </p>
        )}
      </section>
    </>
  );
}
