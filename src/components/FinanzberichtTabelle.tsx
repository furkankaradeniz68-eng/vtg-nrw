"use client";

import { Fragment, useState } from "react";
import type { FinanzZeile } from "@/lib/bc-budget-lines";

function formatEuro(n: number) {
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Sektion = { gruppe: FinanzZeile; kinder: FinanzZeile[] };

function gruppiere(zeilen: readonly FinanzZeile[]) {
  const sektionen: Sektion[] = [];
  let gesamt: FinanzZeile | null = null;
  for (const zeile of zeilen) {
    if (zeile.typ === "gruppe") {
      sektionen.push({ gruppe: zeile, kinder: [] });
    } else if (zeile.typ === "gesamt") {
      gesamt = zeile;
    } else if (sektionen.length > 0) {
      sektionen[sektionen.length - 1].kinder.push(zeile);
    }
  }
  return { sektionen, gesamt };
}

export default function FinanzberichtTabelle({
  planLabel,
  zeilen,
}: {
  planLabel: string;
  zeilen: readonly FinanzZeile[];
}) {
  const [offen, setOffen] = useState<Set<number>>(new Set());
  const { sektionen, gesamt } = gruppiere(zeilen);

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
            <th className="p-3 text-right font-heading">Ausgaben</th>
            <th className="p-3 text-right font-heading">{planLabel}</th>
            <th className="p-3 text-right font-heading">Differenz</th>
          </tr>
        </thead>
        <tbody>
          {sektionen.map((sektion, i) => {
            const istOffen = offen.has(i);
            const aufklappbar = sektion.kinder.length > 0;
            const differenz = sektion.gruppe.plan - sektion.gruppe.ausgaben;
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
                  <td className="p-3 text-right">{formatEuro(sektion.gruppe.ausgaben)}</td>
                  <td className="p-3 text-right">{formatEuro(sektion.gruppe.plan)}</td>
                  <td className="p-3 text-right">{formatEuro(differenz)}</td>
                </tr>
                {istOffen &&
                  sektion.kinder.map((kind, j) => (
                    <tr key={j} className="border-b border-neutral-100 text-neutral-700">
                      <td className="p-3 pl-8">{kind.konto}</td>
                      <td className="p-3 text-right">{formatEuro(kind.ausgaben)}</td>
                      <td className="p-3 text-right">{formatEuro(kind.plan)}</td>
                      <td className="p-3 text-right">{formatEuro(kind.plan - kind.ausgaben)}</td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
          {gesamt && (
            <tr className="bg-vtg-yellow font-medium text-neutral-900">
              <td className="p-3">{gesamt.konto}</td>
              <td className="p-3 text-right">{formatEuro(gesamt.ausgaben)}</td>
              <td className="p-3 text-right">{formatEuro(gesamt.plan)}</td>
              <td className="p-3 text-right">{formatEuro(gesamt.plan - gesamt.ausgaben)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
