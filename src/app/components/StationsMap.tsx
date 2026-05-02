"use client";

import { useState } from "react";
import Map from "./Map";
import { Marker, Popup } from "react-map-gl/maplibre";

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

type Props = {
  stations: Station[];
};

function PriceRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}

export default function StationsMap({ stations }: Props) {
  const [selected, setSelected] = useState<Station | null>(null);

  return (
    <div style={{ height: 480 }} className="rounded-lg overflow-hidden border border-gray-200">
      <Map
        initialViewState={{ longitude: 23.9, latitude: 55.9, zoom: 6.5 }}
      >
        {stations.map((s) => (
          <Marker
            key={s.id}
            longitude={s.lon}
            latitude={s.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(s);
            }}
          >
            <div
              className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow cursor-pointer hover:scale-125 transition-transform"
              title={`${s.brand} – ${s.address}`}
            />
          </Marker>
        ))}

        {selected && (
          <Popup
            longitude={selected.lon}
            latitude={selected.lat}
            anchor="bottom"
            offset={10}
            onClose={() => setSelected(null)}
            closeOnClick={false}
          >
            <div className="text-sm leading-snug min-w-[140px]" style={{ color: "#000", background: "#fff" }}>
              <p className="font-semibold">{selected.brand}</p>
              <p className="mb-2">{selected.address}, {selected.municipality}</p>
              <PriceRow label="A95" value={selected.price95} />
              <PriceRow label="Dyzelinas" value={selected.priceDiesel} />
              <PriceRow label="LPG" value={selected.priceLpg} />
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
