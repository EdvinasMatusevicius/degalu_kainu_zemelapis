"use client";

import { useState, useMemo } from "react";
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

type Props = {
  mapStations: MapStation[];
  rows: TableRow[];
};

// Checks if a station/row matches the search query against brand, municipality, and address.
function matches(q: string, brand: string, municipality: string, address: string) {
  const haystack = `${brand} ${municipality} ${address}`.toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

export default function StationsView({ mapStations, rows }: Props) {
  const [filter, setFilter] = useState("");

  const query = filter.toLowerCase().trim();

  // useMemo means we only re-filter when the source data or query changes,
  // not on every unrelated re-render.
  const filteredMapStations = useMemo(
    () => (query ? mapStations.filter((s) => matches(query, s.brand, s.municipality, s.address)) : mapStations),
    [mapStations, query],
  );

  const filteredRows = useMemo(
    () => (query ? rows.filter((r) => matches(query, r.brand, r.municipality, r.address)) : rows),
    [rows, query],
  );

  return (
    // Single grid with named areas.
    // Mobile:  filter / map (18rem) / list (24rem) stacked vertically.
    // Desktop: filter spans both columns; map (2fr) and list (1fr) share the second row at full height.
    <div className="grid gap-4 [grid-template-areas:'filter'_'map'_'list'] [grid-template-rows:auto_18rem_24rem] md:[grid-template-areas:'filter_filter'_'map_list'] md:grid-cols-[2fr_1fr] md:grid-rows-[auto_1fr] md:h-full">

      <div className="[grid-area:filter]">
        <StationsFilter filter={filter} setFilter={setFilter} />
      </div>

      <div className="[grid-area:map] flex flex-col gap-1 min-h-0">
        <div className="flex-1 min-h-0">
          <StationsMap stations={filteredMapStations} />
        </div>
        <p className="text-xs text-foreground/50">{filteredMapStations.length} stotys su koordinatėmis</p>
      </div>

      <div className="[grid-area:list] overflow-y-auto border border-foreground/20 rounded-lg min-h-0">
        <StationsList rows={filteredRows} />
      </div>

    </div>
  );
}
