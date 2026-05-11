"use client";

import { useState, useMemo, useCallback } from "react";
import StationsMap from "./StationsMap";
import StationsList from "./StationsList";
import StationsFilter from "./StationsFilter";

type MapStation = {
  id: number;
  brand: string;
  address: string;
  municipality: string;
  lat: number;
  lon: number;
  price95: string | null;
  priceDiesel: string | null;
  priceLpg: string | null;
};

type TableRow = {
  brand: string;
  municipality: string;
  address: string;
  price95: string | null;
  priceDiesel: string | null;
  priceLpg: string | null;
};

export type FuelKey = "all" | "dyzelis" | "a95" | "lpg";
export type ViewMode = "operator" | "heatmap";

type FuelProperty = "price95" | "priceDiesel" | "priceLpg";

const FUEL_PROPERTY: Record<Exclude<FuelKey, "all">, FuelProperty> = {
  dyzelis: "priceDiesel",
  a95:     "price95",
  lpg:     "priceLpg",
};

type Props = {
  mapStations: MapStation[];
  rows: TableRow[];
};

// Checks if a station/row matches the search query against brand, municipality, and address.
function matches(q: string, brand: string, municipality: string, address: string) {
  const haystack = `${brand} ${municipality} ${address}`.toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function priceRange(stations: MapStation[], property: FuelProperty) {
  let min = Infinity;
  let max = -Infinity;
  for (const s of stations) {
    const v = s[property];
    if (!v) continue;
    const n = parseFloat(v);
    if (isNaN(n)) continue;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (min === Infinity) return { min: 1.0, max: 2.0 };
  return { min, max };
}

export default function StationsView({ mapStations, rows }: Props) {
  const [filter, setFilter] = useState("");
  const [fuel, setFuel] = useState<FuelKey>("all");
  const [view, setView] = useState<ViewMode>("operator");
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());

  const allBrands = useMemo(
    () => Array.from(new Set(mapStations.map((s) => s.brand))).sort((a, b) => a.localeCompare(b)),
    [mapStations],
  );

  // Heatmap is only meaningful when a specific fuel is picked.
  // When the user switches back to "Visi", reset view so state can't drift.
  const handleSetFuel = useCallback((next: FuelKey) => {
    setFuel(next);
    if (next === "all") setView("operator");
  }, []);

  const query = filter.toLowerCase().trim();

  // useMemo means we only re-filter when the source data or query changes,
  // not on every unrelated re-render.
  const textFilteredMapStations = useMemo(
    () => (query ? mapStations.filter((s) => matches(query, s.brand, s.municipality, s.address)) : mapStations),
    [mapStations, query],
  );

  const textFilteredRows = useMemo(
    () => (query ? rows.filter((r) => matches(query, r.brand, r.municipality, r.address)) : rows),
    [rows, query],
  );

  const brandFilteredMapStations = useMemo(
    () =>
      selectedBrands.size === 0
        ? textFilteredMapStations
        : textFilteredMapStations.filter((s) => selectedBrands.has(s.brand)),
    [textFilteredMapStations, selectedBrands],
  );

  const filteredRows = useMemo(
    () =>
      selectedBrands.size === 0
        ? textFilteredRows
        : textFilteredRows.filter((r) => selectedBrands.has(r.brand)),
    [textFilteredRows, selectedBrands],
  );

  // Fuel filter: keep stations that have a price for the selected fuel.
  const visibleMapStations = useMemo(() => {
    if (fuel === "all") return brandFilteredMapStations;
    const property = FUEL_PROPERTY[fuel];
    return brandFilteredMapStations.filter((s) => s[property] != null);
  }, [brandFilteredMapStations, fuel]);

  const heatmap = useMemo(() => {
    if (view !== "heatmap" || fuel === "all") return null;
    const property = FUEL_PROPERTY[fuel];
    const { min, max } = priceRange(visibleMapStations, property);
    return { property, min, max };
  }, [view, fuel, visibleMapStations]);

  return (
    <>
      <style>{`
        .stations-grid {
          display: grid;
          gap: 1rem;
          grid-template-areas: "filter" "map" "list";
          grid-template-rows: auto 18rem 24rem;
        }
        .stations-grid__filter { grid-area: filter; }
        .stations-grid__map    { grid-area: map; }
        .stations-grid__list   { grid-area: list; }

        @media (min-width: 768px) {
          .stations-grid {
            grid-template-areas: "filter filter" "map list";
            grid-template-columns: 2fr 1.5fr;
            grid-template-rows: auto 1fr;
            height: 100%;
          }
        }
      `}</style>

      <div className="stations-grid">

        <div className="stations-grid__filter">
          <StationsFilter
            filter={filter}
            setFilter={setFilter}
            fuel={fuel}
            setFuel={handleSetFuel}
            view={view}
            setView={setView}
            brands={allBrands}
            selectedBrands={selectedBrands}
            setSelectedBrands={setSelectedBrands}
          />
        </div>

        <div className="stations-grid__map flex flex-col gap-1 min-h-0">
          <div className="flex-1 min-h-0">
            <StationsMap stations={visibleMapStations} heatmap={heatmap} fuel={fuel} />
          </div>
          <p className="text-xs text-foreground/50">{visibleMapStations.length} stotys su koordinatėmis</p>
        </div>

        <div className="stations-grid__list overflow-y-auto border border-foreground/20 rounded-lg min-h-0">
          <StationsList rows={filteredRows} />
        </div>

      </div>
    </>
  );
}
