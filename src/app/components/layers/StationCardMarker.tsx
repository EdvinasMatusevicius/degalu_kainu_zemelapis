"use client";

import { Marker } from "react-map-gl/maplibre";
import { getBrandLogo } from "@/lib/brandLogos";

type Props = {
  id: number;
  brand: string;
  lat: number;
  lon: number;
  price95: string | null;
  priceDiesel: string | null;
  priceLpg: string | null;
  zIndex: number;
  onClick: (id: number) => void;
};

function PriceLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="tabular-nums">{value ?? "—"}</span>
    </div>
  );
}

export default function StationCardMarker(props: Props) {
  const logo = getBrandLogo(props.brand);

  return (
    <Marker
      longitude={props.lon}
      latitude={props.lat}
      anchor="center"
      style={props.zIndex ? { zIndex: props.zIndex } : undefined}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          props.onClick(props.id);
        }}
        className="flex items-center gap-2 pr-3 bg-white border border-gray-400 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none"
      >
        <img
          src={logo}
          alt={props.brand}
          className="w-10 h-10 rounded-full object-contain bg-white border border-gray-300"
        />
        <div className="flex flex-col text-[10px] leading-tight text-gray-800 py-1 min-w-[44px]">
          <PriceLine label="A95" value={props.price95} />
          <PriceLine label="D" value={props.priceDiesel} />
          <PriceLine label="LPG" value={props.priceLpg} />
        </div>
      </button>
    </Marker>
  );
}
