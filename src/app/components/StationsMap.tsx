"use client";

import { useState, useMemo, useCallback } from "react";
import Map from "./Map";
import { Source, Layer, Popup } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, LayerProps } from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";

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

type Props = {
  stations: Station[];
};

// Describes how to draw the circles on the GPU — radius, color, border.
const circleLayer: LayerProps = {
  id: "stations",
  type: "circle",
  paint: {
    "circle-radius": 6,
    "circle-color": "#2563eb",
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};

// Converts our station list into GeoJSON — the standard format maplibre expects.
// All station data goes into "properties" so we can read it back on click.
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

  // Only recompute GeoJSON when the stations array actually changes (e.g. after filtering).
  const geoJson = useMemo(() => toGeoJson(stations), [stations]);

  // interactiveLayerIds=["stations"] tells react-map-gl to populate e.features
  // when you click on a circle from the "stations" layer.
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
    <div className="h-full rounded-lg overflow-hidden border border-foreground/20">
      <Map
        initialViewState={{ longitude: 23.9, latitude: 55.9, zoom: 6.5 }}
        interactiveLayerIds={["stations"]}
        cursor={cursor}
        onClick={handleClick}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("auto")}
      >
        {/*
          <Source> feeds the GeoJSON data into maplibre.
          <Layer> inside it tells maplibre how to render it (circles in our case).
          When `geoJson` changes (after a filter), maplibre re-renders the dots — no DOM changes.
        */}
        <Source id="stations" type="geojson" data={geoJson}>
          <Layer {...circleLayer} />
        </Source>

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
              <PriceRow label="A95" value={selected.price95} />
              <PriceRow label="Dyzelinas" value={selected.priceDiesel} />
              <PriceRow label="LPG" value={selected.priceLpg} />
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
