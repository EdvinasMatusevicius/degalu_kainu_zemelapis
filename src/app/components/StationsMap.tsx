"use client";

import { useState, useMemo, useCallback } from "react";
import Map from "./Map";
import { Popup } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";
import StationCirclesBlue, { LAYER_ID as BLUE_ID } from "./layers/StationCirclesBlue";
import HeatRangeLayer from "./layers/HeatRangeLayer";

type Station = {
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

type Props = { stations: Station[] };

type LayerKey = "blue" | "dyzelis" | "a95" | "lpg";

const LAYERS: Record<LayerKey, { id: string; label: string; property: string }> = {
  blue:    { id: BLUE_ID,        label: "Visi",      property: ""             },
  dyzelis: { id: "heat-dyzelis", label: "Dyzelis",   property: "priceDiesel"  },
  a95:     { id: "heat-a95",     label: "A95",        property: "price95"      },
  lpg:     { id: "heat-lpg",     label: "LPG",        property: "priceLpg"     },
};

function priceRange(stations: Station[], get: (s: Station) => string | null) {
  const prices = stations
    .map(s => { const v = get(s); return v ? parseFloat(v) : null; })
    .filter((p): p is number => p !== null && !isNaN(p));
  if (prices.length === 0) return { min: 1.0, max: 2.0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function toGeoJson(stations: Station[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature",
      id: s.id,
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: {
        id: s.id,
        brand: s.brand,
        address: s.address,
        municipality: s.municipality,
        price95: s.price95,
        priceDiesel: s.priceDiesel,
        priceLpg: s.priceLpg,
      },
    })),
  };
}

function PriceRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}

export default function StationsMap({ stations }: Props) {
  const [selected, setSelected] = useState<Station | null>(null);
  const [cursor, setCursor] = useState("auto");
  const [activeLayer, setActiveLayer] = useState<LayerKey>("blue");

  const geoJson = useMemo(() => toGeoJson(stations), [stations]);

  const ranges = useMemo(() => ({
    dyzelis: priceRange(stations, s => s.priceDiesel),
    a95:     priceRange(stations, s => s.price95),
    lpg:     priceRange(stations, s => s.priceLpg),
  }), [stations]);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const p = feature.properties ?? {};
    setSelected({
      id: p.id,
      brand: p.brand,
      address: p.address,
      municipality: p.municipality,
      lat: e.lngLat.lat,
      lon: e.lngLat.lng,
      price95: p.price95 ?? null,
      priceDiesel: p.priceDiesel ?? null,
      priceLpg: p.priceLpg ?? null,
    });
  }, []);

  const handleLayerChange = useCallback((key: LayerKey) => {
    setActiveLayer(key);
    setSelected(null);
  }, []);

  return (
    <div className="relative h-full rounded-lg overflow-hidden border border-foreground/20">
      <div className="absolute top-2 left-2 z-10 flex gap-1 rounded shadow p-1 bg-white dark:bg-neutral-800">
        {(Object.entries(LAYERS) as [LayerKey, typeof LAYERS[LayerKey]][]).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => handleLayerChange(key)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeLayer === key
                ? "bg-blue-600 text-white"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Map
        initialViewState={{ longitude: 23.9, latitude: 55.9, zoom: 6.5 }}
        interactiveLayerIds={[LAYERS[activeLayer].id]}
        cursor={cursor}
        onClick={handleClick}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("auto")}
      >
        {activeLayer === "blue" && <StationCirclesBlue data={geoJson} />}
        {activeLayer === "dyzelis" && (
          <HeatRangeLayer layerId="heat-dyzelis" property="priceDiesel" data={geoJson}
            minPrice={ranges.dyzelis.min} maxPrice={ranges.dyzelis.max} />
        )}
        {activeLayer === "a95" && (
          <HeatRangeLayer layerId="heat-a95" property="price95" data={geoJson}
            minPrice={ranges.a95.min} maxPrice={ranges.a95.max} />
        )}
        {activeLayer === "lpg" && (
          <HeatRangeLayer layerId="heat-lpg" property="priceLpg" data={geoJson}
            minPrice={ranges.lpg.min} maxPrice={ranges.lpg.max} />
        )}

        {selected && (
          <Popup
            longitude={selected.lon}
            latitude={selected.lat}
            anchor="bottom"
            offset={10}
            onClose={() => setSelected(null)}
            closeOnClick={false}
          >
            <div className="text-sm leading-snug min-w-[140px]" style={{ color: "CanvasText", background: "Canvas" }}>
              <p className="font-semibold">{selected.brand}</p>
              <p className="mb-2">{selected.address}, {selected.municipality}</p>
              <PriceRow label="A95"       value={selected.price95}     />
              <PriceRow label="Dyzelinas" value={selected.priceDiesel} />
              <PriceRow label="LPG"       value={selected.priceLpg}    />
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
