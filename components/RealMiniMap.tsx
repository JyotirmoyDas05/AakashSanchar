"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { getCartoTileUrl } from "@/lib/basemaps";
import type { NewsEvent } from "@/types/news";

export default function RealMiniMap({
  lat,
  lng,
  dotColor,
  isLight,
  events,
}: {
  lat: number;
  lng: number;
  dotColor: string;
  isLight: boolean;
  events?: NewsEvent[];
}) {
  return (
    <div className="w-full h-[110px] relative overflow-hidden">
      <MapContainer
        center={[lat, lng]}
        zoom={6}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
        style={{ background: isLight ? "#f1f5f9" : "#070a07" }}
      >
        <TileLayer url={getCartoTileUrl(isLight ? "light" : "dark")} />
        {(events ?? []).slice(0, 8).map((e) => (
          <CircleMarker
            key={e.id}
            center={[e.lat, e.lng]}
            radius={4}
            pathOptions={{
              color: dotColor,
              fillColor: dotColor,
              fillOpacity: 0.9,
              weight: 1,
            }}
          />
        ))}
        <CircleMarker
          center={[lat, lng]}
          radius={5}
          pathOptions={{
            color: dotColor,
            fillColor: dotColor,
            fillOpacity: 1,
            weight: 2,
          }}
        />
      </MapContainer>
      <div className="absolute bottom-1 left-1.5 text-[7px] font-mono bg-black/60 text-white px-1 py-0.5 rounded pointer-events-none">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
    </div>
  );
}
