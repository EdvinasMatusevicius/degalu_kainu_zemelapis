"use client";

import { useEffect, useRef, useState } from "react";
import type { FuelKey, ViewMode } from "./StationsView";

type Props = {
  filter: string;
  setFilter: (value: string) => void;
  fuel: FuelKey;
  setFuel: (value: FuelKey) => void;
  view: ViewMode;
  setView: (value: ViewMode) => void;
  brands: string[];
  selectedBrands: Set<string>;
  setSelectedBrands: (next: Set<string>) => void;
};

const FUEL_OPTIONS: { value: FuelKey; label: string }[] = [
  { value: "all",     label: "Visi" },
  { value: "dyzelis", label: "Dyzelis" },
  { value: "a95",     label: "A95" },
  { value: "lpg",     label: "LPG" },
];

const selectClass =
  "border border-foreground/20 rounded px-2 py-1.5 text-sm bg-background text-foreground flex-1 md:flex-initial";

const fieldClass =
  "flex flex-row items-center gap-2 md:flex-col md:items-start md:gap-0.5";

const labelClass =
  "text-xs text-foreground/70 w-24 md:w-auto shrink-0";

export default function StationsFilter({
  filter,
  setFilter,
  fuel,
  setFuel,
  view,
  setView,
  brands,
  selectedBrands,
  setSelectedBrands,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const brandsRef = useRef<HTMLDivElement>(null);

  // Heatmap requires a specific fuel; when "Visi" is selected, only the operator view is offered.
  const heatmapAvailable = fuel !== "all";

  useEffect(() => {
    if (!brandsOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (brandsRef.current && !brandsRef.current.contains(e.target as Node)) {
        setBrandsOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [brandsOpen]);

  function toggleBrand(brand: string) {
    const next = new Set(selectedBrands);
    if (next.has(brand)) next.delete(brand);
    else next.add(brand);
    setSelectedBrands(next);
  }

  const brandsLabel =
    selectedBrands.size === 0
      ? "Visi"
      : selectedBrands.size === 1
        ? Array.from(selectedBrands)[0]
        : `${selectedBrands.size} pasirinkti`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col md:flex-row md:items-end gap-2">
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

        <div className={`${expanded ? "flex" : "hidden"} md:flex flex-col md:flex-row md:items-end gap-2`}>
          <div className={fieldClass}>
            <span className={`${labelClass} flex items-center gap-1`}>
              <span>Tinklas</span>
              {selectedBrands.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBrands(new Set())}
                  aria-label="Išvalyti pasirinkimus"
                  title="Išvalyti pasirinkimus"
                  className="text-foreground/50 hover:text-foreground"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </span>
            <div ref={brandsRef} className="relative flex-1 md:flex-initial">
              <button
                type="button"
                onClick={() => setBrandsOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={brandsOpen}
                className={`${selectClass} text-left w-full md:w-44 truncate`}
              >
                {brandsLabel}
              </button>
              {brandsOpen && (
                <div
                  role="listbox"
                  className="absolute z-20 mt-1 left-0 right-0 md:right-auto md:w-56 max-h-64 overflow-y-auto border border-foreground/20 rounded bg-background shadow-lg"
                >
                  {brands.map((b) => (
                    <label
                      key={b}
                      className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-foreground/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.has(b)}
                        onChange={() => toggleBrand(b)}
                      />
                      <span>{b}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <label className={fieldClass}>
            <span className={labelClass}>Degalų tipas</span>
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
          </label>

          <label className={fieldClass}>
            <span className={labelClass}>Atvaizdavimas</span>
            <select
              aria-label="Atvaizdavimas"
              value={view}
              onChange={(e) => setView(e.target.value as ViewMode)}
              className={selectClass}
            >
              <option value="operator">Degaliniu tinklas</option>
              {heatmapAvailable && <option value="heatmap">Šilumos žemėlapis</option>}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
