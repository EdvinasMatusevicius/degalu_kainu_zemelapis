"use client";

import { useCallback } from "react";
import { Map as MapLibre, type MapProps } from "react-map-gl/maplibre";
import type { MapEvent } from "react-map-gl/maplibre";

const STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

type Props = Omit<MapProps, "mapStyle"> & {
  mapStyle?: string;
};

export default function Map({ mapStyle = STYLE_URL, onLoad, ...props }: Props) {
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
    />
  );
}
