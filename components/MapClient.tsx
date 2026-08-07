"use client";

import L from "leaflet";
import { useCallback, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { getCartoTileUrl, warnIfMissingKey } from "@/lib/basemaps";
import { BUCKET_COLOR, bucketForTag } from "@/lib/tagPalette";
import { toHeatPoints } from "@/lib/toHeatPoints";
import type { NewsEvent } from "@/types/news";

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
  minZoom?: number;
  maxBounds?: [[number, number], [number, number]];
  regionId?: string;
}

// Creates a tactical pulsing SVG marker icon — color now from tag bucket (single-chip model)
function createTacticalIcon(
  tagOrCategory: string,
  intensity: number,
  isSelected: boolean,
) {
  const bucket = bucketForTag(tagOrCategory);
  const color = BUCKET_COLOR[bucket] || "#94a3b8";
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
  minZoom,
  maxBounds,
  isUserInteractingRef,
}: {
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxBounds: [[number, number], [number, number]];
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
      // Relax guardrails for the duration of the fly so World→SA (tightening)
      // doesn't clamp intermediate zooms/bounds and look like a snap.
      const prevMinZoom = map.getMinZoom();
      const _prevBounds = map.getBounds();
      const targetBounds = L.latLngBounds(maxBounds as L.LatLngBoundsLiteral);
      const tightening = minZoom > prevMinZoom;

      if (tightening) {
        map.setMinZoom(Math.min(prevMinZoom, minZoom));
        // Keep world bounds during the fly so the start (world) isn't considered out-of-bounds.
        map.setMaxBounds(
          L.latLngBounds([
            [-85, -180],
            [85, 180],
          ] as L.LatLngBoundsLiteral),
        );
      }

      map.flyTo(center, zoom, {
        duration: 1.4,
        easeLinearity: 0.22,
      });
      prevCenterRef.current = center;
      prevZoomRef.current = zoom;

      if (tightening) {
        const onEnd = () => {
          map.setMinZoom(minZoom);
          map.setMaxBounds(targetBounds);
        };
        map.once("moveend", onEnd);
        // Fallback if moveend doesn't fire
        const timer = setTimeout(onEnd, 1600);
        return () => {
          map.off("moveend", onEnd);
          clearTimeout(timer);
        };
      }
    }
  }, [center, zoom, minZoom, maxBounds, map, isUserInteractingRef]);

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

// Locks panning/zoom to the active region when idle. Tightening
// (World→SA) is handled by MapController so the fly isn't clamped.
function ViewGuard({
  minZoom,
  maxBounds,
}: {
  minZoom: number;
  maxBounds: [[number, number], [number, number]];
}) {
  const map = useMap();
  const prevMinZoomRef = useRef<number>(map.getMinZoom());

  useEffect(() => {
    const tightening = minZoom > prevMinZoomRef.current;
    // Let MapController handle the tightening fly — it relaxes bounds/minZoom
    // for the duration and tightens on moveend. Only handle widening/idle here.
    if (tightening) {
      prevMinZoomRef.current = minZoom;
      return;
    }

    map.setMinZoom(minZoom);
    map.setMaxBounds(L.latLngBounds(maxBounds as L.LatLngBoundsLiteral));
    prevMinZoomRef.current = minZoom;
    if (
      !map
        .getBounds()
        .intersects(L.latLngBounds(maxBounds as L.LatLngBoundsLiteral))
    ) {
      map.panInsideBounds(L.latLngBounds(maxBounds as L.LatLngBoundsLiteral), {
        animate: true,
      });
    }
  }, [map, minZoom, maxBounds]);
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
  onClusterSelect,
}: {
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
}) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    // Native Leaflet cluster group matching world-monitor specs
    // Restored spiderfying: zoomToBounds true, window only for small/high-zoom clusters
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

    if (onClusterSelect) {
      const handler = (e: unknown) => {
        const ce = e as { layer: L.MarkerCluster; latlng: L.LatLng };
        const childCount = ce.layer.getChildCount();
        const currentZoom = map.getZoom();
        // Only open RegionWindow for small or high-zoom clusters (search-filtered Nepal Floods etc.)
        // Big diverse clusters at low zoom just zoom/spiderfy as before — fixes "every cluster opens window"
        if (currentZoom < 7 && childCount > 10) return;
        const markers = ce.layer.getAllChildMarkers() as unknown as Array<
          L.Marker & { options: { eventId?: string } }
        >;
        const ids = markers
          .map((m) => (m.options as unknown as { eventId?: string }).eventId)
          .filter(Boolean) as string[];
        const containerPoint = map.latLngToContainerPoint(ce.latlng);
        const container = map.getContainer();
        const rect = container.getBoundingClientRect();
        onClusterSelect(ids, {
          x: rect.left + containerPoint.x,
          y: rect.top + containerPoint.y,
        });
      };
      // biome-ignore lint/suspicious/noExplicitAny: leaflet typings for clusterclick
      (clusterGroup as any).on("clusterclick", handler);
      return () => {
        // biome-ignore lint/suspicious/noExplicitAny: leaflet typings
        (clusterGroup as any).off("clusterclick", handler);
        if (clusterGroupRef.current) {
          map.removeLayer(clusterGroupRef.current);
          clusterGroupRef.current = null;
        }
      };
    }

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map, onClusterSelect]);

  // Sync Leaflet markers to events / selected marker changes
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup) return;

    clusterGroup.clearLayers();

    const markers = events.map((ev) => {
      const isSelected = ev.id === selectedEventId;
      const tagKey = ev.tag ?? ev.category;
      const bucket = bucketForTag(tagKey);
      const marker = L.marker([ev.lat, ev.lng], {
        icon: createTacticalIcon(tagKey, ev.intensity, isSelected),
        category: bucket,
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

    // MarkerCluster computes clusters from the map's current zoom/bounds.
    // On a region toggle we swap both the marker set *and* fly the viewport
    // (world zoom 2 → south-asia 5.5 over 1.2s). If we add the new markers
    // while the fly is still in progress the cluster math runs against the
    // old zoom and we end up with the sparse-white-marker state from the bug
    // report. Refresh after the animation (and once on next frame) so the
    // clusters recompute at the final viewport.
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    raf = requestAnimationFrame(() => clusterGroup.refreshClusters());
    timer = setTimeout(() => clusterGroup.refreshClusters(), 1350);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [events, selectedEventId, onEventSelect, map]);

  // Keep clusters in sync with any programmatic viewport change (flyTo,
  // ViewGuard's setMinZoom/setMaxBounds). Without this a pan/zoom that
  // finishes after addLayers won't re-cluster until the next user interaction.
  useEffect(() => {
    const group = clusterGroupRef.current;
    if (!group) return;
    const refresh = () => requestAnimationFrame(() => group.refreshClusters());
    map.on("moveend", refresh);
    map.on("zoomend", refresh);
    return () => {
      map.off("moveend", refresh);
      map.off("zoomend", refresh);
    };
  }, [map]);

  return null;
}

export default function MapClient({
  events,
  selectedEventId,
  onEventSelect,
  onClusterSelect,
  center,
  zoom,
  onViewportChange,
  visualMode,
  theme = "dark",
  minZoom = 2,
  maxBounds = [
    [-85, -180],
    [85, 180],
  ],
  regionId,
}: MapClientProps) {
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    warnIfMissingKey();
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
        minZoom={minZoom}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        attributionControl={false}
      >
        {/* CartoDB Dark / Light basemap — key injected via NEXT_PUBLIC_CARTO_API_KEY */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={getCartoTileUrl(theme === "light" ? "light" : "dark")}
          maxZoom={20}
        />

        {/* Fly to Controller — handles smooth World↔SA with relaxed guardrails */}
        <MapController
          center={center}
          zoom={zoom}
          minZoom={minZoom}
          maxBounds={maxBounds}
          isUserInteractingRef={isUserInteractingRef}
        />

        {/* Live region guardrails — keeps zoom/pan locked to active region */}
        <ViewGuard minZoom={minZoom} maxBounds={maxBounds} />

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

        {/* Tactical Nodes Mode — keyed by region so the markerClusterGroup is
            recreated at the target zoom instead of being reused mid-fly, which
            otherwise leaves the sparse-white-marker state until next interaction. */}
        {visualMode === "nodes" && (
          <ClusteredMarkers
            key={regionId ?? "default"}
            events={events}
            selectedEventId={selectedEventId}
            onEventSelect={onEventSelect}
            onClusterSelect={onClusterSelect}
          />
        )}

        {/* Hotspot Heatmap Mode */}
        {visualMode === "heat" && (
          <HeatLayer key={regionId ?? "heat"} events={events} />
        )}
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
