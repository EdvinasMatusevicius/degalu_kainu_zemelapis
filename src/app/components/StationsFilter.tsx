"use client";

import { useState } from "react";

type Props = {
  filter: string;
  setFilter: (value: string) => void;
};

export default function StationsFilter({ filter, setFilter }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <input
          type="text"
          placeholder="Filtruoti pagal tinklą, savivaldybę ar adresą…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-foreground/20 rounded px-3 py-1.5 text-sm w-full md:w-80 bg-background text-foreground"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="border border-foreground/20 rounded px-1 py-1.5 text-sm bg-background text-foreground hover:bg-foreground/5"
        >
          {expanded ? "Slėpti filtrus" : "Daugiau filtrų"}
        </button>
      </div>

      {expanded && (
        <div className="border border-foreground/20 rounded p-3 text-sm text-foreground/60">
          Papildomi filtrai bus čia.
        </div>
      )}
    </div>
  );
}
