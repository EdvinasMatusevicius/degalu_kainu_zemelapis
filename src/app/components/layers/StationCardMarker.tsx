"use client";

import type { CSSProperties } from "react";
import { Marker } from "react-map-gl/maplibre";
import { getBrandLogo } from "@/lib/brandLogos";
import type { FuelKey } from "../StationsView";

type Props = {
  id: number;
  brand: string;
  lat: number;
  lon: number;
  price95: string | null;
  priceDiesel: string | null;
  priceLpg: string | null;
  zIndex: number;
  fuel: FuelKey;
  glowColor?: string;
  bgColor?: string;
  selected?: boolean;
  onClick: (id: number) => void;
};

function PriceLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="tabular-nums font-bold">{value ?? "—"}</span>
    </div>
  );
}

function FuelPrice({ fuel, price95, priceDiesel, priceLpg }: {
  fuel: FuelKey;
  price95: string | null;
  priceDiesel: string | null;
  priceLpg: string | null;
}) {
  if (fuel === "all") {
    return (
      <>
        <PriceLine label="A95" value={price95} />
        <PriceLine label="D" value={priceDiesel} />
        <PriceLine label="LPG" value={priceLpg} />
      </>
    );
  }
  if (fuel === "a95") return <PriceLine label="A95" value={price95} />;
  if (fuel === "dyzelis") return <PriceLine label="D" value={priceDiesel} />;
  return <PriceLine label="LPG" value={priceLpg} />;
}

export default function StationCardMarker(props: Props) {
  const logo = getBrandLogo(props.brand);

  const buttonStyle: CSSProperties = {
    transition: "transform 150ms ease-out",
    ...(props.selected && { transform: "scale(1.12)" }),
    ...(props.glowColor && { boxShadow: `0 0 14px 4px ${props.glowColor}` }),
    ...(props.bgColor && { backgroundColor: props.bgColor }),
  };

  return (
    <Marker
      longitude={props.lon}
      latitude={props.lat}
      anchor="center"
      style={{ zIndex: props.zIndex }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          props.onClick(props.id);
        }}
        style={buttonStyle}
        className="flex items-center gap-2 pr-3 bg-white border border-gray-400 rounded-full shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none"
      >
        <img
          src={logo}
          alt={props.brand}
          className="w-10 h-10 rounded-full object-contain bg-white border border-gray-300"
        />
        <div className="flex flex-col text-[10px] leading-tight text-gray-800 py-1 min-w-[44px]">
          <FuelPrice
            fuel={props.fuel}
            price95={props.price95}
            priceDiesel={props.priceDiesel}
            priceLpg={props.priceLpg}
          />
        </div>
      </button>
    </Marker>
  );
}
