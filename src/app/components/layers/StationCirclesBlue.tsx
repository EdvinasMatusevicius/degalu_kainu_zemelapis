import { Source, Layer } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";

export const LAYER_ID = "stations-blue";

const layer: LayerProps = {
  id: LAYER_ID,
  type: "circle",
  paint: {
    "circle-radius": 6,
    "circle-color": "#2563eb",
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};

type Props = { data: FeatureCollection<Point> };

export default function StationCirclesBlue({ data }: Props) {
  return (
    <Source id={LAYER_ID} type="geojson" data={data}>
      <Layer {...layer} />
    </Source>
  );
}
