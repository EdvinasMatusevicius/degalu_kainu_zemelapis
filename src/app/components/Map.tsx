"use client";

import { useCallback, useEffect } from "react";
import {
  Map as MapLibre,
  FullscreenControl,
  type MapProps,
} from "react-map-gl/maplibre";
import type { MapEvent } from "react-map-gl/maplibre";

const STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

// MapLibre warns once per missing station icon even though our
// styleimagemissing handler supplies a transparent placeholder. Drop
// just that warning so real browser errors still come through.
function silenceMissingImageWarnings() {
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("could not be loaded. Please make sure you have added the image")) {
      return;
    }
    original(...args);
  };
}

type Props = Omit<MapProps, "mapStyle"> & {
  mapStyle?: string;
  children?: React.ReactNode;
};

export default function Map({ mapStyle = STYLE_URL, onLoad, children, ...props }: Props) {
  useEffect(() => {
    silenceMissingImageWarnings();
  }, []);

  const handleLoad = useCallback((e: MapEvent) => {
    const map = e.target;
    map.on("styleimagemissing", ({ id }: { id: string }) => {
      if (!map.hasImage(id)) {
        const data = new Uint8Array(4); // 1×1 transparent RGBA
        map.addImage(id, { width: 1, height: 1, data });
      }
    });
    onLoad?.(e);
  }, [onLoad]);

  return (
    <MapLibre
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%" }}
      onLoad={handleLoad}
      {...props}
    >
      <FullscreenControl position="top-right" />
      {children}
    </MapLibre>
  );
}
