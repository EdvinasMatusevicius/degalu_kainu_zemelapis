"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
import HeatRangeLayer, { priceToColor } from "./layers/HeatRangeLayer";
import type { FuelKey, FocusRequest } from "./StationsView";
import FavoriteStar from "./FavoriteStar";

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
  fuel: FuelKey;
  selectedId: number | null;
  setSelectedId: React.Dispatch<React.SetStateAction<number | null>>;
  focusRequest: FocusRequest | null;
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

export default function StationsMap({
  stations,
  heatmap,
  fuel,
  selectedId,
  setSelectedId,
  focusRequest,
}: Props) {
  const [cursor, setCursor] = useState("auto");
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [bounds, setBounds] = useState<LngLatBounds | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const mapRef = useRef<MapEvent["target"] | null>(null);

  const geoJson = useMemo(() => toGeoJson(stations), [stations]);

  const interactiveLayerId = heatmap ? HEAT_LAYER_ID : BLUE_ID;

  //  only render pill markers when the GL circles/heat are hidden
  const showPills = zoom >= PILL_TAKEOVER_ZOOM && bounds !== null;

  const visiblePillStations = useMemo(() => {
    if (!showPills || !bounds) return [];
    return stations.filter((s) => bounds.contains([s.lon, s.lat]));
  }, [showPills, bounds, stations]);

  const stationById = useMemo(() => {
    const m = new Map<number, Station>();
    for (const s of stations) m.set(s.id, s);
    return m;
  }, [stations]);

  // Read inside the focusRequest effect via a ref so the effect's deps stay
  // limited to focusRequest — otherwise filter changes that mutate stationById
  // would re-fire the flyTo.
  const stationByIdRef = useRef(stationById);
  useEffect(() => {
    stationByIdRef.current = stationById;
  }, [stationById]);

  useEffect(() => {
    if (!focusRequest || !mapRef.current) return;
    const s = stationByIdRef.current.get(focusRequest.id);
    if (!s) return;
    setPopupOpen(true);
    mapRef.current.flyTo({
      center: [s.lon, s.lat],
      zoom: Math.max(FLY_TO_ZOOM, mapRef.current.getZoom()),
      duration: 800,
    });
  }, [focusRequest]);

  const handlePillClick = useCallback((id: number) => {
    setSelectedId((prev) => {
      if (prev === id) {
        // Already focused — toggle popup, keep focus so the pill stays raised.
        setPopupOpen((open) => !open);
        return prev;
      }
      setPopupOpen(true);
      return id;
    });
  }, [setSelectedId]);

  // Both modes: clicking a GL feature zooms in so the HTML pill marker takes over.
  // Also focus the station so its pill is raised and the popup is shown once
  // we cross the takeover zoom threshold.
  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const geom = feature.geometry as Point;
    const [lon, lat] = geom.coordinates;
    const id = feature.properties?.id as number | undefined;
    if (typeof id === "number") {
      setSelectedId(id);
      setPopupOpen(true);
    }
    e.target.flyTo({
      center: [lon, lat],
      zoom: Math.max(FLY_TO_ZOOM, e.target.getZoom()),
      duration: 800,
    });
  }, [setSelectedId]);

  const syncView = useCallback((map: MapEvent["target"]) => {
    setZoom(map.getZoom());
    setBounds(map.getBounds());
  }, []);

  const handleLoad = useCallback(
    (e: MapEvent) => {
      mapRef.current = e.target;
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
          visiblePillStations.map((s) => {
            let glowColor: string | undefined;
            let bgColor: string | undefined;
            if (heatmap) {
              const raw = s[heatmap.property];
              const price = raw == null ? null : parseFloat(raw);
              glowColor = priceToColor(price, heatmap.min, heatmap.max);
              bgColor = priceToColor(price, heatmap.min, heatmap.max, {
                saturation: 70,
                lightness: 90,
                nullColor: "#f3f4f6",
              });
            }
            return (
              <StationCardMarker
                key={s.id}
                id={s.id}
                brand={s.brand}
                lat={s.lat}
                lon={s.lon}
                price95={s.price95}
                priceDiesel={s.priceDiesel}
                priceLpg={s.priceLpg}
                zIndex={selectedId === s.id ? 10 : 0}
                fuel={fuel}
                glowColor={glowColor}
                bgColor={bgColor}
                selected={selectedId === s.id}
                onClick={handlePillClick}
              />
            );
          })}

        {showPills && popupOpen && selectedId !== null && stationById.get(selectedId) && (() => {
          const s = stationById.get(selectedId)!;
          return (
            <Popup
              longitude={s.lon}
              latitude={s.lat}
              anchor="top"
              offset={28}
              closeOnClick={false}
              onClose={() => setPopupOpen(false)}
            >
              <div className="text-xs text-gray-800 min-w-[140px]">
                <p className="font-semibold flex items-center gap-1.5">
                  <FavoriteStar id={s.id} size={14} inactiveClass="text-gray-300 hover:text-gray-500" />
                  {s.brand}
                </p>
                <p>
                  {s.address}, {s.municipality}
                </p>
              </div>
            </Popup>
          );
        })()}

      </MapView>
    </div>
  );
}
