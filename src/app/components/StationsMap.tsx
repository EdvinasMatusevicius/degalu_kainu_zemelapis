"use client";

import { useState, useMemo, useCallback } from "react";
import MapView from "./Map";
import { Popup } from "react-map-gl/maplibre";
import type {
  MapLayerMouseEvent,
  ViewStateChangeEvent,
  MapEvent,
} from "react-map-gl/maplibre";
import type { LngLatBounds } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import StationCirclesBlue, {
  LAYER_ID as BLUE_ID,
  PILL_TAKEOVER_ZOOM,
} from "./layers/StationCirclesBlue";
import StationCardMarker from "./layers/StationCardMarker";
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
const INITIAL_ZOOM = 6.5;
const FLY_TO_ZOOM = 13;

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
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [bounds, setBounds] = useState<LngLatBounds | null>(null);
  const [zMap, setZMap] = useState<Map<number, number>>(new Map());
  const [counter, setCounter] = useState(0);

  const geoJson = useMemo(() => toGeoJson(stations), [stations]);

  const interactiveLayerId = heatmap ? HEAT_LAYER_ID : BLUE_ID;

  //  only render pill markers when the GL circles are hidden
  const showPills = !heatmap && zoom >= PILL_TAKEOVER_ZOOM && bounds !== null;

  const visiblePillStations = useMemo(() => {
    if (!showPills || !bounds) return [];
    return stations.filter((s) => bounds.contains([s.lon, s.lat]));
  }, [showPills, bounds, stations]);

  const stationById = useMemo(() => {
    const m = new Map<number, Station>();
    for (const s of stations) m.set(s.id, s);
    return m;
  }, [stations]);

  const handlePillClick = useCallback(
    (id: number) => {
      const currentZ = zMap.get(id);
      if (currentZ !== undefined) {
        let maxZ = 0;
        for (const v of zMap.values()) if (v > maxZ) maxZ = v;
        if (currentZ === maxZ) {
          setZMap((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
          return;
        }
      }
      const newZ = counter + 1;
      setCounter(newZ);
      setZMap((prev) => new Map(prev).set(id, newZ));
    },
    [zMap, counter],
  );

  const handleClosePopup = useCallback((id: number) => {
    setZMap((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;

      if (heatmap) {
        // Preserve existing popup behavior for heatmap mode.
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
        return;
      }

      // Operator mode: zoom in so the HTML pill marker for this station appears.
      const geom = feature.geometry as Point;
      const [lon, lat] = geom.coordinates;
      e.target.flyTo({
        center: [lon, lat],
        zoom: Math.max(FLY_TO_ZOOM, e.target.getZoom()),
        duration: 800,
      });
    },
    [heatmap],
  );

  const syncView = useCallback((map: MapEvent["target"]) => {
    setZoom(map.getZoom());
    setBounds(map.getBounds());
  }, []);

  const handleLoad = useCallback(
    (e: MapEvent) => {
      syncView(e.target);
    },
    [syncView],
  );

  // `move` (not `moveend`) so pills appear as soon as zoom crosses the
  // threshold during a flyTo animation, instead of only after it finishes.
  const handleMove = useCallback(
    (e: ViewStateChangeEvent) => {
      syncView(e.target);
    },
    [syncView],
  );

  return (
    <div className="relative h-full rounded-lg overflow-hidden border border-foreground/20">
      <MapView
        initialViewState={{ longitude: 23.9, latitude: 55.9, zoom: INITIAL_ZOOM }}
        interactiveLayerIds={[interactiveLayerId]}
        cursor={cursor}
        onClick={handleClick}
        onLoad={handleLoad}
        onMove={handleMove}
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

        {showPills &&
          visiblePillStations.map((s) => (
            <StationCardMarker
              key={s.id}
              id={s.id}
              brand={s.brand}
              lat={s.lat}
              lon={s.lon}
              price95={s.price95}
              priceDiesel={s.priceDiesel}
              priceLpg={s.priceLpg}
              zIndex={zMap.get(s.id) ?? 0}
              onClick={handlePillClick}
            />
          ))}

        {Array.from(zMap.entries()).map(([id, z]) => {
          const s = stationById.get(id);
          if (!s) return null;
          return (
            <Popup
              key={id}
              longitude={s.lon}
              latitude={s.lat}
              anchor="bottom"
              offset={20}
              closeOnClick={false}
              onClose={() => handleClosePopup(id)}
              style={{ zIndex: z }}
            >
              <div className="text-xs text-gray-800 min-w-[140px]">
                <p className="font-semibold">{s.brand}</p>
                <p>
                  {s.address}, {s.municipality}
                </p>
              </div>
            </Popup>
          );
        })}

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
      </MapView>
    </div>
  );
}
