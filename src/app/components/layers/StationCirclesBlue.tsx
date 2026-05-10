"use client";

import { useEffect } from "react";
import { Source, Layer, useMap } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";
import { BRAND_LOGOS } from "@/lib/brandLogos";

export const LAYER_ID = "stations-blue";
const ICON_LAYER_ID = "stations-icons";
const ICON_PIXEL_SIZE = 64;

const circleLayer: LayerProps = {
  id: LAYER_ID,
  type: "circle",
  paint: {
    "circle-radius": 10,
    "circle-color": "#ffffff",
    "circle-stroke-width": 1,
    "circle-stroke-color": "#7e7e7e",
  },
};

const iconLayer: LayerProps = {
  id: ICON_LAYER_ID,
  type: "symbol",
  layout: {
    "icon-image": ["get", "brand"],
    "icon-size": 0.25,
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
};

type Props = { data: FeatureCollection<Point> };

// Rasterize the loaded image into a fixed-size square so every brand renders
// at a consistent on-map size regardless of the source asset's intrinsic dims.
function rasterize(img: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_PIXEL_SIZE;
  canvas.height = ICON_PIXEL_SIZE;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.min(
    ICON_PIXEL_SIZE / img.naturalWidth,
    ICON_PIXEL_SIZE / img.naturalHeight,
  );
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (ICON_PIXEL_SIZE - w) / 2, (ICON_PIXEL_SIZE - h) / 2, w, h);
  return ctx.getImageData(0, 0, ICON_PIXEL_SIZE, ICON_PIXEL_SIZE);
}

export default function StationCirclesBlue({ data }: Props) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    let cancelled = false;

    Object.entries(BRAND_LOGOS).forEach(([brand, url]) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        // Map.tsx's styleimagemissing handler may have inserted a 1×1
        // transparent placeholder before our image finished loading;
        // replace it so the real logo shows up.
        if (map.hasImage(brand)) map.removeImage(brand);
        map.addImage(brand, rasterize(img));
      };
      img.onerror = () => {
        console.warn(`Failed to load brand logo for "${brand}": ${url}`);
      };
      img.src = url;
    });

    return () => {
      cancelled = true;
    };
  }, [mapRef]);

  return (
    <Source id={LAYER_ID} type="geojson" data={data}>
      <Layer {...circleLayer} />
      <Layer {...iconLayer} />
    </Source>
  );
}
