"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { findNearestEvent } from "@/lib/findNearestEvent";
import { toHeatPoints } from "@/lib/toHeatPoints";
import type { NewsEvent } from "@/types/news";

interface MapClientProps {
  events: NewsEvent[];
  onEventSelect: (eventId: string | null) => void;
}

function HeatLayer({ events }: { events: NewsEvent[] }) {
  const map = useMap();
  const heatRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    window.L = L;

    let cancelled = false;

    async function init() {
      await import("leaflet.heat");
      if (cancelled) return;

      if (heatRef.current) {
        map.removeLayer(heatRef.current);
      }

      const points = toHeatPoints(events);
      if (points.length === 0) return;

      const heat = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
      });
      heat.addTo(map);
      heatRef.current = heat;
    }
    init();

    return () => {
      cancelled = true;
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [events, map]);

  return null;
}

function ClickHandler({
  events,
  onEventSelect,
}: {
  events: NewsEvent[];
  onEventSelect: (id: string | null) => void;
}) {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useMapEvents({
    click(e) {
      const nearest = findNearestEvent(
        eventsRef.current,
        e.latlng.lat,
        e.latlng.lng,
      );
      onEventSelect(nearest?.id ?? null);
    },
  });

  return null;
}

export default function MapClient({ events, onEventSelect }: MapClientProps) {
  return (
    <div className="h-full w-full">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatLayer events={events} />
        <ClickHandler events={events} onEventSelect={onEventSelect} />
      </MapContainer>
    </div>
  );
}
