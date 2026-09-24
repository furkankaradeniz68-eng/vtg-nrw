import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import VerfahrenSearchTable from "@/components/VerfahrenSearchTable";
import { requireInternSession } from "@/lib/auth";
import { getAllVerfahren, getVerfahrenByBezirksregierung } from "@/lib/bc-companies";

export const metadata: Metadata = { title: "Verfahrensauswahl | VTG Nordrhein-Westfalen" };

export default async function VerfahrensauswahlPage() {
  const session = await requireInternSession();
  const list =
    session.role === "admin"
      ? await getAllVerfahren()
      : ((await getVerfahrenByBezirksregierung())[session.username] ?? []);

  return (
    <>
      <PageHero title="Verfahrensauswahl" />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {list.length > 0 ? (
          <VerfahrenSearchTable list={list} />
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
