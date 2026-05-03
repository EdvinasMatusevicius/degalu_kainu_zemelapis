"use client";

import { useState, useMemo } from "react";
import StationsMap from "./StationsMap";

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
    // grid-rows-[auto_1fr]: first row is only as tall as the filter input, second row takes all remaining height.
    // h-full: fills the flex-1 container given by page.tsx.
    <div className="grid grid-rows-[auto_1fr] h-full gap-4">

      {/* Row 1 — filter input */}
      <div>
        <input
          type="text"
          placeholder="Filtruoti pagal tinklą, savivaldybę ar adresą…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-foreground/20 rounded px-3 py-1.5 text-sm w-80 bg-background text-foreground"
        />
      </div>

      {/* Row 2 — map (left, bigger) + station list (right, scrollable).
          min-h-0: without this, a grid row that contains overflowing children
          would expand instead of staying at 1fr. */}
      <div className="grid grid-cols-[2fr_1fr] gap-4 min-h-0">

        {/* Map column — flex column so the count line sits below the map */}
        <div className="flex flex-col gap-1 min-h-0">
          <div className="flex-1 min-h-0">
            <StationsMap stations={filteredMapStations} />
          </div>
          <p className="text-xs text-foreground/50">{filteredMapStations.length} stotys su koordinatėmis</p>
        </div>

        {/* List column — scrolls vertically when rows overflow.
            The thead is sticky so column headers stay visible while scrolling. */}
        <div className="overflow-y-auto border border-foreground/20 rounded-lg">
          {filteredRows.length > 0 ? (
            <table className="border-collapse text-sm w-full">
              <thead className="sticky top-0 bg-background z-10">
                <tr>
                  <th className="border border-foreground/20 px-3 py-2 text-left">Tinklas</th>
                  <th className="border border-foreground/20 px-3 py-2 text-left">Savivaldybė</th>
                  <th className="border border-foreground/20 px-3 py-2 text-left">Adresas</th>
                  <th className="border border-foreground/20 px-3 py-2 text-right">A95</th>
                  <th className="border border-foreground/20 px-3 py-2 text-right">Dyzelinas</th>
                  <th className="border border-foreground/20 px-3 py-2 text-right">LPG</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={i}>
                    <td className="border border-foreground/20 px-3 py-2">{row.brand}</td>
                    <td className="border border-foreground/20 px-3 py-2">{row.municipality}</td>
                    <td className="border border-foreground/20 px-3 py-2">{row.address}</td>
                    <td className="border border-foreground/20 px-3 py-2 text-right">{row.price95 ?? "—"}</td>
                    <td className="border border-foreground/20 px-3 py-2 text-right">{row.priceDiesel ?? "—"}</td>
                    <td className="border border-foreground/20 px-3 py-2 text-right">{row.priceLpg ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-foreground/50 text-sm p-4">Nerasta stočių pagal paieškos užklausą.</p>
          )}
        </div>

      </div>
    </div>
  );
}
