"use client";

import { Map as MapLibre, type MapProps } from "react-map-gl/maplibre";

const STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

type Props = Omit<MapProps, "mapStyle"> & {
  mapStyle?: string;
};

export default function Map({ mapStyle = STYLE_URL, ...props }: Props) {
  return (
    <MapLibre
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%" }}
      {...props}
    />
  );
}
