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

export type Heatmap = {
  property: "price95" | "priceDiesel" | "priceLpg";
  min: number;
  max: number;
};

type Props = {
  stations: Station[];
  heatmap: Heatmap | null;
};

const HEAT_LAYER_ID = "heat";

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

export default function StationsMap({ stations, heatmap }: Props) {
  const [selected, setSelected] = useState<Station | null>(null);
  const [cursor, setCursor] = useState("auto");

  const geoJson = useMemo(() => toGeoJson(stations), [stations]);

  const interactiveLayerId = heatmap ? HEAT_LAYER_ID : BLUE_ID;

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

  return (
    <div className="relative h-full rounded-lg overflow-hidden border border-foreground/20">
      <Map
        initialViewState={{ longitude: 23.9, latitude: 55.9, zoom: 6.5 }}
        interactiveLayerIds={[interactiveLayerId]}
        cursor={cursor}
        onClick={handleClick}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("auto")}
      >
        {heatmap ? (
          <HeatRangeLayer
            layerId={HEAT_LAYER_ID}
            property={heatmap.property}
            data={geoJson}
            minPrice={heatmap.min}
            maxPrice={heatmap.max}
          />
        ) : (
          <StationCirclesBlue data={geoJson} />
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
