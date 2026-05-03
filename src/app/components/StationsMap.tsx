"use client";

import { useState, useMemo, useCallback } from "react";
import Map from "./Map";
import { Popup } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";
import StationCirclesBlue, { LAYER_ID as BLUE_ID } from "./layers/StationCirclesBlue";
import StationCirclesRed, { LAYER_ID as RED_ID } from "./layers/StationCirclesRed";

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

type LayerKey = "blue" | "red";

const LAYERS: Record<LayerKey, { id: string; label: string }> = {
  blue: { id: BLUE_ID, label: "Blue" },
  red:  { id: RED_ID,  label: "Red"  },
};

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
        {(Object.entries(LAYERS) as [LayerKey, { id: string; label: string }][]).map(([key, { label }]) => (
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
        {activeLayer === "red"  && <StationCirclesRed  data={geoJson} />}

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
              <PriceRow label="A95"      value={selected.price95}     />
              <PriceRow label="Dyzelinas" value={selected.priceDiesel} />
              <PriceRow label="LPG"       value={selected.priceLpg}    />
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
