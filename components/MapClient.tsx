"use client";

import L from "leaflet";
import { useCallback, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { toHeatPoints } from "@/lib/toHeatPoints";
import type { NewsCategory, NewsEvent } from "@/types/news";

interface MapClientProps {
  events: NewsEvent[];
  selectedEventId: string | null;
  onEventSelect: (
    eventId: string | null,
    screenPos?: { x: number; y: number },
  ) => void;
  onClusterSelect?: (
    eventIds: string[],
    screenPos: { x: number; y: number },
  ) => void;
  center: [number, number];
  zoom: number;
  onViewportChange: (center: [number, number], zoom: number) => void;
  visualMode: "nodes" | "heat";
  theme?: "dark" | "light";
}

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  news: "#9ca3af",
  conflict: "#ef4444",
  disaster: "#f97316",
  health: "#a855f7",
  space: "#06b6d4",
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
  isUserInteractingRef,
}: {
  center: [number, number];
  zoom: number;
  isUserInteractingRef: React.RefObject<boolean>;
}) {
  const map = useMap();
  const prevCenterRef = useRef<[number, number]>(center);
  const prevZoomRef = useRef<number>(zoom);

  useEffect(() => {
    if (isUserInteractingRef.current) {
      return;
    }

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const latDiff = Math.abs(center[0] - currentCenter.lat);
    const lngDiff = Math.abs(center[1] - currentCenter.lng);
    const zoomDiff = Math.abs(zoom - currentZoom);

    // Only fly if coordinates are significantly different from current viewport
    if (latDiff > 0.05 || lngDiff > 0.05 || zoomDiff > 0.1) {
      map.flyTo(center, zoom, {
        duration: 1.2,
        easeLinearity: 0.2,
      });
      prevCenterRef.current = center;
      prevZoomRef.current = zoom;
    }
  }, [center, zoom, map, isUserInteractingRef]);

  return null;
}

// Controller to automatically invalidate Leaflet map size when layout/container resizes
function MapResizer() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    if (!container) return;

    let animId: number;

    const observer = new ResizeObserver(() => {
      animId = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [map]);

  return null;
}

const MIN_LAT = -85;
const MAX_LAT = 85;
const MIN_LNG = -180;
const MAX_LNG = 180;

// State updater that captures user pans and zooms to sync with the URL
function MapStateUpdater({
  onViewportChange,
  isUserInteractingRef,
}: {
  onViewportChange: (center: [number, number], zoom: number) => void;
  isUserInteractingRef: React.RefObject<boolean>;
}) {
  const map = useMap();

  useMapEvents({
    dragstart() {
      isUserInteractingRef.current = true;
    },
    dragend() {
      isUserInteractingRef.current = true;
      const currentZoom = map.getZoom();
      const c = map.getCenter();

      const isOutOfBounds =
        c.lat < MIN_LAT ||
        c.lat > MAX_LAT ||
        c.lng < MIN_LNG ||
        c.lng > MAX_LNG;

      if (isOutOfBounds) {
        // Clamp to closest inside border point
        const borderTarget: [number, number] = [
          Math.max(MIN_LAT, Math.min(MAX_LAT, c.lat)),
          Math.max(MIN_LNG, Math.min(MAX_LNG, c.lng)),
        ];
        map.panTo(borderTarget, {
          animate: true,
          duration: 0.8,
        });
        onViewportChange(borderTarget, currentZoom);

        setTimeout(() => {
          isUserInteractingRef.current = false;
        }, 900);
      } else {
        // Within bounds: update viewport
        onViewportChange([c.lat, c.lng], currentZoom);
        setTimeout(() => {
          isUserInteractingRef.current = false;
        }, 300);
      }
    },
    zoomstart() {
      isUserInteractingRef.current = true;
    },
    zoomend() {
      const c = map.getCenter();
      onViewportChange([c.lat, c.lng], map.getZoom());

      setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 300);
    },
  });

  return null;
}

// Tracks selected event marker position on map move/zoom/resize and auto-closes when out of bounds
function SelectedEventTracker({
  events,
  selectedEventId,
  onEventSelect,
}: {
  events: NewsEvent[];
  selectedEventId: string | null;
  onEventSelect: (
    eventId: string | null,
    screenPos?: { x: number; y: number },
  ) => void;
}) {
  const map = useMap();
  const prevPosRef = useRef<{ x: number; y: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!selectedEventId) {
      prevPosRef.current = null;
      return;
    }

    const event = events.find((e) => e.id === selectedEventId);
    if (!event) {
      prevPosRef.current = null;
      onEventSelect(null);
      return;
    }

    const latLng = L.latLng(event.lat, event.lng);
    const bounds = map.getBounds();
    const mapContainer = map.getContainer();
    if (!mapContainer) return;

    const containerPoint = map.latLngToContainerPoint(latLng);
    const rect = mapContainer.getBoundingClientRect();

    const isVisibleOnScreen =
      containerPoint.x >= -30 &&
      containerPoint.x <= mapContainer.clientWidth + 30 &&
      containerPoint.y >= -30 &&
      containerPoint.y <= mapContainer.clientHeight + 30 &&
      bounds.contains(latLng);

    if (!isVisibleOnScreen) {
      if (prevPosRef.current !== null) {
        prevPosRef.current = null;
        onEventSelect(null);
      }
      return;
    }

    const screenPos = {
      x: rect.left + containerPoint.x,
      y: rect.top + containerPoint.y,
    };

    if (
      prevPosRef.current &&
      Math.abs(prevPosRef.current.x - screenPos.x) < 0.5 &&
      Math.abs(prevPosRef.current.y - screenPos.y) < 0.5
    ) {
      return;
    }

    prevPosRef.current = screenPos;
    onEventSelect(selectedEventId, screenPos);
  }, [map, events, selectedEventId, onEventSelect]);

  useMapEvents({
    move() {
      updatePosition();
    },
    zoom() {
      updatePosition();
    },
    viewreset() {
      updatePosition();
    },
    resize() {
      updatePosition();
    },
  });

  useEffect(() => {
    prevPosRef.current = null;
    updatePosition();
  }, [updatePosition]);

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

// Clustered Markers controller using Leaflet.markercluster
function ClusteredMarkers({
  events,
  selectedEventId,
  onEventSelect,
}: {
  events: NewsEvent[];
  selectedEventId: string | null;
  onEventSelect: (
    eventId: string | null,
    screenPos?: { x: number; y: number },
  ) => void;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    // Native Leaflet cluster group matching world-monitor specs
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const markers = cluster.getAllChildMarkers();

        // Get category breakdown
        const breakdown: Record<string, number> = {};
        for (const marker of markers) {
          // biome-ignore lint/suspicious/noExplicitAny: leaflet marker options does not include custom attributes
          const category = (marker.options as any).category || "news";
          breakdown[category] = (breakdown[category] || 0) + 1;
        }

        // Determine predominant category
        let dominantCategory = "news";
        let maxCount = 0;
        for (const [cat, catCount] of Object.entries(breakdown)) {
          if (catCount > maxCount) {
            maxCount = catCount;
            dominantCategory = cat;
          }
        }

        // Dynamic colors based on dominant category
        let colorClass = "cluster-cyan";
        if (dominantCategory === "health") {
          colorClass = "cluster-green";
        } else if (
          dominantCategory === "conflict" ||
          dominantCategory === "disaster"
        ) {
          colorClass = "cluster-yellow";
        }

        // Sizing based on count
        let size = 28;
        if (count >= 10 && count < 100) size = 36;
        if (count >= 100) size = 44;

        const html = `
          <div class="cluster-node" style="width: ${size}px; height: ${size}px;">
            <div class="cluster-bg"></div>
            <span class="cluster-label">${count}</span>
          </div>
        `;

        return L.divIcon({
          html,
          className: `custom-cluster-icon ${colorClass}`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map]);

  // Sync Leaflet markers to events / selected marker changes
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) return;

    clusterGroup.clearLayers();

    const markers = events.map((ev) => {
      const isSelected = ev.id === selectedEventId;
      const marker = L.marker([ev.lat, ev.lng], {
        icon: createTacticalIcon(ev.category, ev.intensity, isSelected),
        category: ev.category,
        eventId: ev.id,
        // biome-ignore lint/suspicious/noExplicitAny: leaflet marker options does not include custom attributes
      } as any);

      marker.on("click", (e: L.LeafletMouseEvent) => {
        const containerPoint = map.latLngToContainerPoint(e.latlng);
        const mapContainer = map.getContainer();
        const rect = mapContainer.getBoundingClientRect();
        const screenPos = {
          x: rect.left + containerPoint.x,
          y: rect.top + containerPoint.y,
        };
        // Hide tooltip immediately on click
        marker.closeTooltip();
        onEventSelect(ev.id, screenPos);
      });

      // Only bind tooltip when not selected (avoid tooltip overlapping the card/window)
      if (!isSelected) {
        marker.bindTooltip(
          `
          <div class="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            ${ev.source} • ${ev.locationName}
          </div>
          <div class="font-semibold text-xs mt-0.5 max-w-xs truncate text-brand-text-primary">
            ${ev.title}
          </div>
        `,
          {
            direction: "top",
            offset: [0, -5],
            opacity: 0.95,
          },
        );
      }

      return marker;
    });

    clusterGroup.addLayers(markers);
  }, [events, selectedEventId, onEventSelect, map]);

  return null;
}

export default function MapClient({
  events,
  selectedEventId,
  onEventSelect,
  onClusterSelect: _onClusterSelect,
  center,
  zoom,
  onViewportChange,
  visualMode,
  theme = "dark",
}: MapClientProps) {
  const isUserInteractingRef = useRef(false);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
        minZoom={2}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        attributionControl={false}
      >
        {/* CartoDB Dark / Light basemap */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={
            theme === "light"
              ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          }
          maxZoom={20}
        />

        {/* Fly to Controller */}
        <MapController
          center={center}
          zoom={zoom}
          isUserInteractingRef={isUserInteractingRef}
        />

        {/* Map Container Resize Observer */}
        <MapResizer />

        {/* Viewport Sync Controller */}
        <MapStateUpdater
          onViewportChange={onViewportChange}
          isUserInteractingRef={isUserInteractingRef}
        />

        {/* Selected Event Popup Position & Bounds Tracker */}
        {selectedEventId && (
          <SelectedEventTracker
            events={events}
            selectedEventId={selectedEventId}
            onEventSelect={onEventSelect}
          />
        )}

        {/* Tactical Nodes Mode */}
        {visualMode === "nodes" && (
          <ClusteredMarkers
            events={events}
            selectedEventId={selectedEventId}
            onEventSelect={onEventSelect}
          />
        )}

        {/* Hotspot Heatmap Mode */}
        {visualMode === "heat" && <HeatLayer events={events} />}
      </MapContainer>

      {/* World-Monitor Geographic HUD Grid Overlay (Barely visible whisper grid) */}
      <div
        className="pointer-events-none absolute inset-0 z-1000 select-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
        aria-hidden="true"
      />

      {/* Custom minimal map attribution overlay (bottom-center aligned) */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-1001 pointer-events-auto text-[8px] font-mono text-slate-650 tracking-widest select-none bg-transparent whitespace-nowrap hidden md:block">
        <a
          href="https://leafletjs.com"
          target="_blank"
          rel="noreferrer"
          className="hover:text-cyan-400 transition-colors"
        >
          LEAFLET
        </a>
        <span className="mx-1.5 opacity-40">|</span>
        <span>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan-400 transition-colors"
          >
            OPENSTREETMAP
          </a>
          <span className="ml-1">CONTRIBUTORS</span>
        </span>
        <span className="mx-1.5 opacity-40">|</span>
        <a
          href="https://carto.com"
          target="_blank"
          rel="noreferrer"
          className="hover:text-cyan-400 transition-colors"
        >
          CARTO
        </a>
      </div>
    </div>
  );
}
