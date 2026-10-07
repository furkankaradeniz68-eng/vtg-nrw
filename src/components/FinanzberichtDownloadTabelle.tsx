"use client";

import { Fragment, useState } from "react";
import type { FinanzDownloadZeile, FinanzAnsicht } from "@/lib/bc-budget-lines";

function formatEuro(n: number) {
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatEuroOrBlank(n: number | null) {
  return n === null ? "" : formatEuro(n);
}

function formatProzent(n: number | null) {
  if (n === null) return "";
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

type Sektion = { gruppe: FinanzDownloadZeile; kinder: FinanzDownloadZeile[] };

function gruppiere(zeilen: readonly FinanzDownloadZeile[]) {
  const sektionen: Sektion[] = [];
  const fussZeilen: FinanzDownloadZeile[] = [];
  for (const zeile of zeilen) {
    if (zeile.typ === "gruppe") {
      sektionen.push({ gruppe: zeile, kinder: [] });
    } else if (zeile.typ === "gesamt" || zeile.typ === "sonder") {
      fussZeilen.push(zeile);
    } else if (sektionen.length > 0) {
      sektionen[sektionen.length - 1].kinder.push(zeile);
    }
  }
  return { sektionen, fussZeilen };
}

// Zwei Layouts, 1:1 aus vtg-rlp/src/components/FinanzberichtDownloadTabelle.tsx
// uebernommen (2026-10-07):
// - "voll" (Ausfuehrungskosten A1): 5 Spalten Soll-Ist-Vergleich je Ansicht.
// - "einfach" (A2 / Einnahmen): nur der rohe Betrag der gewaehlten Ansicht,
//   im Original gibt es dort keine Plan-/Diff-Spalten.
export default function FinanzberichtDownloadTabelle({
  planLabel,
  ansicht,
  vollSpalten,
  zeilen,
}: {
  planLabel: string;
  ansicht: FinanzAnsicht;
  vollSpalten: boolean;
  zeilen: readonly FinanzDownloadZeile[];
}) {
  const [offen, setOffen] = useState<Set<number>>(new Set());
  const { sektionen, fussZeilen } = gruppiere(zeilen);
  const spalten = (zeile: FinanzDownloadZeile) => (ansicht === "laufzeit" ? zeile.laufzeit : zeile.haushaltsjahr);

  function toggle(index: number) {
    setOffen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-3"></th>
            <th className="p-3 text-right font-heading">{vollSpalten ? "Ausgaben" : "Betrag"}</th>
            {vollSpalten && (
              <>
                <th className="p-3 text-right font-heading">nicht zu.fä.</th>
                <th className="p-3 text-right font-heading">{planLabel}</th>
                <th className="p-3 text-right font-heading">Diff EUR</th>
                <th className="p-3 text-right font-heading">Diff %</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sektionen.map((sektion, i) => {
            const istOffen = offen.has(i);
            const aufklappbar = sektion.kinder.length > 0;
            const s = spalten(sektion.gruppe);
            return (
              <Fragment key={i}>
                <tr
                  onClick={aufklappbar ? () => toggle(i) : undefined}
                  className={
                    "bg-vtg-yellow font-medium text-neutral-900" +
                    (aufklappbar ? " cursor-pointer select-none hover:bg-vtg-orange hover:text-white" : "")
                  }
                >
                  <td className="p-3">
                    {aufklappbar && (
                      <span className="mr-2 inline-block w-3 text-xs">{istOffen ? "▾" : "▸"}</span>
                    )}
                    {sektion.gruppe.konto}
                  </td>
                  <td className="p-3 text-right">{formatEuroOrBlank(s.ausgaben)}</td>
                  {vollSpalten && (
                    <>
                      <td className="p-3 text-right">{formatEuroOrBlank(s.nichtZuFaehig)}</td>
                      <td className="p-3 text-right">{formatEuroOrBlank(s.plan)}</td>
                      <td className="p-3 text-right">{formatEuroOrBlank(s.diffEur)}</td>
                      <td className="p-3 text-right">{formatProzent(s.diffProz)}</td>
                    </>
                  )}
                </tr>
                {istOffen &&
                  sektion.kinder.map((kind, j) => {
                    const ks = spalten(kind);
                    return (
                      <tr key={j} className="border-b border-neutral-100 text-neutral-700">
                        <td className="p-3 pl-8">{kind.konto}</td>
                        <td className="p-3 text-right">{formatEuroOrBlank(ks.ausgaben)}</td>
                        {vollSpalten && (
                          <>
                            <td className="p-3 text-right">{formatEuroOrBlank(ks.nichtZuFaehig)}</td>
                            <td className="p-3 text-right">{formatEuroOrBlank(ks.plan)}</td>
                            <td className="p-3 text-right">{formatEuroOrBlank(ks.diffEur)}</td>
                            <td className="p-3 text-right">{formatProzent(ks.diffProz)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
              </Fragment>
            );
          })}
          {fussZeilen.map((zeile, i) => {
            const s = spalten(zeile);
            return (
              <tr key={i} className="bg-vtg-yellow font-medium text-neutral-900">
                <td className="p-3">{zeile.konto}</td>
                <td className="p-3 text-right">{formatEuroOrBlank(s.ausgaben)}</td>
                {vollSpalten && (
                  <>
                    <td className="p-3 text-right">{formatEuroOrBlank(s.nichtZuFaehig)}</td>
                    <td className="p-3 text-right">{formatEuroOrBlank(s.plan)}</td>
                    <td className="p-3 text-right">{formatEuroOrBlank(s.diffEur)}</td>
                    <td className="p-3 text-right">{formatProzent(s.diffProz)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
