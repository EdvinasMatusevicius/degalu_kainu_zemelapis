import { Source, Layer } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";

type Props = {
  layerId: string;
  property: string;
  data: FeatureCollection<Point>;
  minPrice: number;
  maxPrice: number;
};

function buildColorExpr(property: string, minPrice: number, maxPrice: number) {
  const STEPS = 12;
  const stops: (string | number)[] = [0, "#9ca3af"]; // null prices → grey
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const price = minPrice + t * (maxPrice - minPrice);
    const hue = Math.round(240 - t * 240);
    stops.push(price, `hsl(${hue},85%,50%)`);
  }
  return ["interpolate", ["linear"], ["to-number", ["get", property]], ...stops];
}

export default function HeatRangeLayer({ layerId, property, data, minPrice, maxPrice }: Props) {
  const colorExpr = buildColorExpr(property, minPrice, maxPrice);
  const hasPrice = ["!=", ["get", property], null];

  const blendLayer: LayerProps = {
    id: `${layerId}-blend`,
    type: "circle",
    filter: hasPrice as any,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 30, 12, 100] as any,
      "circle-opacity": 0.18,
      "circle-blur": 1,
      "circle-color": colorExpr as any,
    },
  };

  const dotLayer: LayerProps = {
    id: layerId,
    type: "circle",
    paint: {
      "circle-radius": 5,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": ["case", hasPrice, "#ffffff", "#6b7280"] as any,
      "circle-color": ["case", hasPrice, colorExpr, "rgba(0,0,0,0)"] as any,
    },
  };

  return (
    <Source id={`${layerId}-src`} type="geojson" data={data}>
      <Layer {...blendLayer} />
      <Layer {...dotLayer} />
    </Source>
  );
}
