"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { toHeatPoints } from "@/lib/toHeatPoints";
import type { NewsCategory, NewsEvent } from "@/types/news";

interface MapClientProps {
  events: NewsEvent[];
  selectedEventId: string | null;
  onEventSelect: (eventId: string | null) => void;
  center: [number, number];
  zoom: number;
  onViewportChange: (center: [number, number], zoom: number) => void;
  visualMode: "nodes" | "heat";
}

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  breaking: "#f43f5e",
  protests: "#f97316",
  disasters: "#ef4444",
  politics: "#3b82f6",
  economy: "#10b981",
  tech: "#06b6d4",
};

// Creates a tactical pulsing SVG marker icon
function createTacticalIcon(
  category: NewsCategory,
  intensity: number,
  isSelected: boolean,
) {
  const color = CATEGORY_COLORS[category] || "#94a3b8";
  const baseSize = isSelected ? 20 : 12;
  const size = baseSize + intensity * 6;
  const glowOpacity = isSelected ? 0.75 : 0.4;
  const pulseClass = isSelected ? "animate-ping" : "";

  const html = `
    <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
      <!-- Glowing base ring -->
      <div class="absolute rounded-full pointer-events-none ${pulseClass}" 
           style="width: 175%; height: 175%; background-color: ${color}; opacity: ${glowOpacity}; filter: blur(3px);">
      </div>
      <!-- Center core -->
      <div class="absolute rounded-full border border-white" 
           style="width: 70%; height: 70%; background-color: ${color}; border-width: 1.5px; box-shadow: 0 0 8px ${color}; transition: all 200ms ease;">
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-tactical-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Controller to fly the map viewport to coordinate updates
function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  const prevCenterRef = useRef<[number, number]>(center);
  const prevZoomRef = useRef<number>(zoom);

  useEffect(() => {
    const latDiff = Math.abs(center[0] - prevCenterRef.current[0]);
    const lngDiff = Math.abs(center[1] - prevCenterRef.current[1]);
    const zoomDiff = Math.abs(zoom - prevZoomRef.current);

    if (latDiff > 0.0001 || lngDiff > 0.0001 || zoomDiff > 0.01) {
      map.flyTo(center, zoom, {
        duration: 1.2,
        easeLinearity: 0.2,
      });
      prevCenterRef.current = center;
      prevZoomRef.current = zoom;
    }
  }, [center, zoom, map]);

  return null;
}

// State updater that captures user pans and zooms to sync with the URL
function MapStateUpdater({
  onViewportChange,
}: {
  onViewportChange: (center: [number, number], zoom: number) => void;
}) {
  const map = useMapEvents({
    dragend() {
      const c = map.getCenter();
      onViewportChange([c.lat, c.lng], map.getZoom());
    },
    zoomend() {
      const c = map.getCenter();
      onViewportChange([c.lat, c.lng], map.getZoom());
    },
  });

  return null;
}

// Heatmap Layer using leaflet.heat
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
        heatRef.current = null;
      }

      const points = toHeatPoints(events);
      if (points.length === 0) return;

      // Custom color gradient matches deep blue and neon elements
      const heat = L.heatLayer(points, {
        radius: 35,
        blur: 20,
        maxZoom: 8,
        gradient: {
          0.2: "#00c7fc", // Cyan
          0.5: "#10b981", // Emerald
          0.8: "#f97316", // Orange
          1.0: "#f43f5e", // Rose
        },
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

export default function MapClient({
  events,
  selectedEventId,
  onEventSelect,
  center,
  zoom,
  onViewportChange,
  visualMode,
}: MapClientProps) {
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false} // Disable default top-left control to place clean widgets later
      >
        {/* CartoDB Dark Matter basemap (High-contrast minimalist dark theme) */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />

        {/* Fly to Controller */}
        <MapController center={center} zoom={zoom} />

        {/* Viewport Sync Controller */}
        <MapStateUpdater onViewportChange={onViewportChange} />

        {/* Tactical Nodes Mode */}
        {visualMode === "nodes" &&
          events.map((ev) => {
            const isSelected = ev.id === selectedEventId;
            return (
              <Marker
                key={ev.id}
                position={[ev.lat, ev.lng]}
                icon={createTacticalIcon(ev.category, ev.intensity, isSelected)}
                eventHandlers={{
                  click: () => {
                    onEventSelect(ev.id);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                  <div className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {ev.source} • {ev.locationName}
                  </div>
                  <div className="font-semibold text-xs mt-0.5 max-w-xs truncate">
                    {ev.title}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}

        {/* Hotspot Heatmap Mode */}
        {visualMode === "heat" && <HeatLayer events={events} />}
      </MapContainer>
    </div>
  );
}
