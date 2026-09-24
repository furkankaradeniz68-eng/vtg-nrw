"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SimpleTable from "@/components/SimpleTable";

type VerfahrenRow = { nr: string; name: string };

export default function VerfahrenSearchTable({ list }: { list: VerfahrenRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((v) => v.nr.toLowerCase().includes(q) || v.name.toLowerCase().includes(q));
  }, [query, list]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Verfahren suchen (Nr. oder Name)…"
        className="mb-4 w-full border border-neutral-300 px-3 py-2 text-sm focus:border-vtg-yellow focus:outline-none"
      />
      {filtered.length > 0 ? (
        <SimpleTable
          columns={["Produkt-Nr.", "Flurbereinigungsverfahren"]}
          rows={filtered.map((v) => [
            <Link
              key={v.nr}
              href={`/mitgliederbereich/verfahrensdaten?id=${v.nr}`}
              className="text-vtg-orange hover:underline"
            >
              {v.nr}
            </Link>,
            v.name,
          ])}
        />
      ) : (
        <p className="text-base leading-relaxed text-neutral-700">Kein Verfahren gefunden.</p>
      )}
    </div>
  );
}
