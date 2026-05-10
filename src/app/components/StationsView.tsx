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

  const filteredRows = useMemo(
    () => (query ? rows.filter((r) => matches(query, r.brand, r.municipality, r.address)) : rows),
    [rows, query],
  );

  // Fuel filter: keep stations that have a price for the selected fuel.
  const visibleMapStations = useMemo(() => {
    if (fuel === "all") return textFilteredMapStations;
    const property = FUEL_PROPERTY[fuel];
    return textFilteredMapStations.filter((s) => s[property] != null);
  }, [textFilteredMapStations, fuel]);

  const heatmap = useMemo(() => {
    if (view !== "heatmap" || fuel === "all") return null;
    const property = FUEL_PROPERTY[fuel];
    const { min, max } = priceRange(visibleMapStations, property);
    return { property, min, max };
  }, [view, fuel, visibleMapStations]);

  return (
    // Single grid with named areas.
    // Mobile:  filter / map (18rem) / list (24rem) stacked vertically.
    // Desktop: filter spans both columns; map (2fr) and list (1fr) share the second row at full height.
    <div className="grid gap-4 [grid-template-areas:'filter'_'map'_'list'] [grid-template-rows:auto_18rem_24rem] md:[grid-template-areas:'filter_filter'_'map_list'] md:grid-cols-[2fr_1fr] md:grid-rows-[auto_1fr] md:h-full">

      <div className="[grid-area:filter]">
        <StationsFilter
          filter={filter}
          setFilter={setFilter}
          fuel={fuel}
          setFuel={handleSetFuel}
          view={view}
          setView={setView}
        />
      </div>

      <div className="[grid-area:map] flex flex-col gap-1 min-h-0">
        <div className="flex-1 min-h-0">
          <StationsMap stations={visibleMapStations} heatmap={heatmap} />
        </div>
        <p className="text-xs text-foreground/50">{visibleMapStations.length} stotys su koordinatėmis</p>
      </div>

      <div className="[grid-area:list] overflow-y-auto border border-foreground/20 rounded-lg min-h-0">
        <StationsList rows={filteredRows} />
      </div>

    </div>
  );
}
