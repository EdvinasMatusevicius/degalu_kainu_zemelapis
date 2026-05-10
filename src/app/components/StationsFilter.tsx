"use client";

import { useState } from "react";
import type { FuelKey, ViewMode } from "./StationsView";

type Props = {
  filter: string;
  setFilter: (value: string) => void;
  fuel: FuelKey;
  setFuel: (value: FuelKey) => void;
  view: ViewMode;
  setView: (value: ViewMode) => void;
};

const FUEL_OPTIONS: { value: FuelKey; label: string }[] = [
  { value: "all",     label: "Visi" },
  { value: "dyzelis", label: "Dyzelis" },
  { value: "a95",     label: "A95" },
  { value: "lpg",     label: "LPG" },
];

const selectClass =
  "border border-foreground/20 rounded px-2 py-1.5 text-sm bg-background text-foreground";

export default function StationsFilter({
  filter,
  setFilter,
  fuel,
  setFuel,
  view,
  setView,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  // Heatmap requires a specific fuel; when "Visi" is selected, only the operator view is offered.
  const heatmapAvailable = fuel !== "all";

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

        {/* Mobile: collapsed behind a toggle. Desktop: always visible inline. */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="md:hidden border border-foreground/20 rounded px-1 py-1.5 text-sm bg-background text-foreground hover:bg-foreground/5"
        >
          {expanded ? "Slėpti filtrus" : "Daugiau filtrų"}
        </button>

        <div className={`${expanded ? "flex" : "hidden"} md:flex flex-col md:flex-row md:items-center gap-2`}>
          <select
            aria-label="Degalų tipas"
            value={fuel}
            onChange={(e) => setFuel(e.target.value as FuelKey)}
            className={selectClass}
          >
            {FUEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            aria-label="Žemėlapio rodinys"
            value={view}
            onChange={(e) => setView(e.target.value as ViewMode)}
            className={selectClass}
          >
            <option value="operator">Operatorius</option>
            {heatmapAvailable && <option value="heatmap">Šilumos žemėlapis</option>}
          </select>
        </div>
      </div>
    </div>
  );
}
