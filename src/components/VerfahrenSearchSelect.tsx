"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VerfahrenOption = { nr: string; name: string; dienstsitz: string };

export default function VerfahrenSearchSelect({
  verfahren,
  name = "verfahrenNr",
}: {
  verfahren: VerfahrenOption[];
  name?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<VerfahrenOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return verfahren;
    return verfahren.filter(
      (v) => v.name.toLowerCase().includes(q) || v.nr.toLowerCase().includes(q) || v.dienstsitz.toLowerCase().includes(q),
    );
  }, [query, verfahren]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.nr ?? ""} required />
      <input
        type="text"
        value={selected ? `${selected.name} (${selected.nr})` : query}
        onChange={(e) => {
          setSelected(null);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Verfahren suchen…"
        autoComplete="off"
        className="w-full border border-neutral-300 px-3 py-2 text-sm focus:border-vtg-yellow focus:outline-none"
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border border-neutral-300 bg-white shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((v) => (
              <li key={v.nr}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(v);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-vtg-yellow/40"
                >
                  {v.name} ({v.nr}) — {v.dienstsitz}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-neutral-500">Kein Treffer.</li>
          )}
        </ul>
      )}
    </div>
  );
}
