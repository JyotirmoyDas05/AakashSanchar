"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BreakingTicker from "@/components/BreakingTicker";
import CamerasWidget from "@/components/CamerasWidget";
import CommandPalette from "@/components/CommandPalette";
import DashboardShell from "@/components/DashboardShell";
import FilterWidget from "@/components/FilterWidget";
import HotspotCard from "@/components/HotspotCard";
import LeftControlRail from "@/components/LeftControlRail";
import LocateWidget from "@/components/LocateWidget";
import MapWrapper from "@/components/MapWrapper";
import MiniWireWidget from "@/components/MiniWireWidget";
import OutbreaksWidget from "@/components/OutbreaksWidget";
import { RadarSweep } from "@/components/RadarSweep";
import RegionWindow from "@/components/RegionWindow";
import SettingsWidget, {
  type SettingsState,
} from "@/components/SettingsWidget";
import StocksWidget from "@/components/StocksWidget";
import StreamsWidget from "@/components/StreamsWidget";
import WireWorkspace from "@/components/WireWorkspace";
import { useGdeltArticles } from "@/hooks/useGdeltArticles";
import { useGdeltEvents } from "@/hooks/useGdeltEvents";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUrlState } from "@/hooks/useUrlState";
import { filterEvents } from "@/lib/filterEvents";
import { applyCoordinateJitter } from "@/lib/gdelt";
import {
  aggregateRegionalEvents,
  mostSpecificPlaceName,
  placeParts,
} from "@/lib/regionAggregate";
import { resolveRegion } from "@/lib/regions";
import { type SpatialBounds, searchEvents } from "@/lib/search";
import type { NewsCategory, NewsEvent } from "@/types/news";

/** Markers drawn per state/province/UT (or per country where none is known). */
const PER_REGION_MARKERS = 8;

// Frame the map on a matched entity. Prefers the density centroid over the
// bounding-box midpoint: a box padded around one distant outlier still has a
// midpoint out at sea, which is how "Nepal" used to land in the Red Sea.
function framingFor(
  bounds: SpatialBounds | null,
  centroid?: [number, number] | null,
): { center: [number, number]; zoom: number } | null {
  if (!bounds) return null;
  const center: [number, number] = centroid ?? [
    (bounds.minLat + bounds.maxLat) / 2,
    (bounds.minLng + bounds.maxLng) / 2,
  ];
  const delta = Math.max(
    bounds.maxLat - bounds.minLat,
    bounds.maxLng - bounds.minLng,
  );
  let zoom = 4.5;
  if (delta < 1.2) zoom = 9;
  else if (delta < 3.5) zoom = 7.5;
  else if (delta < 7) zoom = 6.5;
  else if (delta < 14) zoom = 5.5;
  return { center, zoom };
}

export default function Home() {
  const {
    center,
    zoom,
    timeRange,
    activeLayers,
    q: searchQ,
    setCenter,
    setZoom,
    setActiveLayers,
    setQ,
    isUrlStateLoaded,
  } = useUrlState();

  const [activeTab, setActiveTab] = useState<"map" | "wire">("map");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventPos, setSelectedEventPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Marks a query as already framed. handleGeneralSelect claims it so the
  // ?q= fallback effect below does not re-run a naive whole-corpus search and
  // overwrite the precise entity bounds the user actually clicked.
  const hasAutoOpenedForSearch = useRef<string | null>(null);

  // Region window: multiple events for a cluster
  const [regionEventIds, setRegionEventIds] = useState<string[] | null>(null);
  // The query the region window was opened FOR. null when it was opened by a
  // cluster click. Previously the window read the live ?q= instead, so a stale
  // search ("nepal") relabelled and re-filtered every later cluster click.
  const [regionQuery, setRegionQuery] = useState<string | null>(null);
  const [regionPos, setRegionPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const [visualMode, _setVisualMode] = useState<"nodes" | "heat">("nodes");
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [isLocateOpen, setIsLocateOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Settings State with LocalStorage Persistence
  const [settings, setSettings] = useState<SettingsState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("world_monitor_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            layoutMode:
              parsed.layoutMode === "sidebar" ? "sidebar" : "floating",
            timezone: parsed.timezone || "UTC",
            dateFormat: parsed.dateFormat || "ISO",
            theme: parsed.theme === "light" ? "light" : "dark",
            regionView: resolveRegion(parsed.regionView).id,
          };
        }
      } catch (_err) {
        // ignore parse error
      }
    }
    return {
      layoutMode: "floating",
      timezone: "UTC",
      dateFormat: "ISO",
      theme: "dark",
      regionView: "world",
    };
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", settings.theme);
      document.body.setAttribute("data-theme", settings.theme);
    }
  }, [settings.theme]);

  const handleUpdateSettings = useCallback(
    (newSettings: Partial<SettingsState>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              "world_monitor_settings",
              JSON.stringify(updated),
            );
          } catch (_err) {
            // ignore save error
          }
        }
        return updated;
      });
    },
    [],
  );

  const { events: gdeltEvents } = useGdeltEvents();
  const activeRegion = resolveRegion(settings.regionView);
  const { articles: tickerArticles, digests: locationDigests } =
    useGdeltArticles(activeRegion.id);

  // Fly the map to the active region's preset view on load and on toggle.
  // Skip the very first run only for World so a shared/custom view in the URL
  // is respected; South Asia must still snap to its tighter preset on reload.
  const skipFirstRegionSync = useRef(true);
  useEffect(() => {
    if (!isUrlStateLoaded) return;
    if (skipFirstRegionSync.current) {
      skipFirstRegionSync.current = false;
      if (activeRegion.id === "world") return;
    }
    setCenter(activeRegion.center);
    setZoom(activeRegion.zoom);
  }, [activeRegion, isUrlStateLoaded, setCenter, setZoom]);

  const filteredEvents = useMemo(() => {
    return filterEvents(
      gdeltEvents,
      activeLayers,
      timeRange,
      activeRegion.bbox,
    );
  }, [gdeltEvents, activeLayers, timeRange, activeRegion]);

  // RSS-derived regional hotspots: turn ticker articles into map markers
  // so South Asia regional view has dense, language-diverse hotspots
  // (BBC Tamil/Hindi/etc.) even where GDELT coverage is sparse. Capped to keep clustering fast.
  // Robustness fix (reports/sri-lanka-iphone): an English piece like
  // "Apple to launch next iPhone — adaderana.lk" is *published by* a Sri Lankan
  // outlet but is not *about* Sri Lanka (the 10 hits are footer chrome). We
  // only elevate RSS items that are regionally relevant: non-English South-Asian
  // language items are inherently regional; English items must mention a South-Asia
  // place-name in the syndicated title/description.
  const rssHotspots = useMemo(() => {
    const candidates = tickerArticles.filter(
      (a) =>
        a.locationName !== "SYSTEM STATUS" &&
        // Unresolvable articles carry NaN and are simply not drawn.
        Number.isFinite(a.lat) &&
        Number.isFinite(a.lng),
    );
    const filtered = filterEvents(
      candidates,
      activeLayers,
      timeRange,
      activeRegion.bbox,
    );
    filtered.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
    // Stratified cap, not a global one. A plain "newest N worldwide" starves
    // whole regions (Nepal once got 2 of 120); an uncapped map buries them under
    // 350-marker metro stacks. Take the newest few per state/province instead,
    // so every state, UT and neighbouring country keeps a presence.
    const perRegion = new Map<string, NewsEvent[]>();
    for (const e of filtered) {
      const { admin1, country } = placeParts(e);
      const key = admin1 ? `${admin1}|${country}` : country;
      const bucket = perRegion.get(key);
      if (bucket) {
        if (bucket.length < PER_REGION_MARKERS) bucket.push(e);
      } else {
        perRegion.set(key, [e]);
      }
    }
    // Nudge coincident markers apart (~250 m, deterministic). Most dispatches
    // resolve to a city or country centroid, so without this they land on one
    // pixel and no amount of zooming separates them.
    return applyCoordinateJitter([...perRegion.values()].flat());
  }, [tickerArticles, activeLayers, timeRange, activeRegion]);

  const mapEvents = useMemo(() => {
    // De-dupe by id (GDELT and RSS ids are namespaced differently, but be safe)
    const seen = new Set<string>();
    const merged: typeof filteredEvents = [];
    for (const e of [...filteredEvents, ...rssHotspots]) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        merged.push(e);
      }
    }
    return merged;
  }, [filteredEvents, rssHotspots]);

  // Global search pool combines GDELT and RSS feeds
  const searchableEvents = useMemo(() => {
    const seen = new Set<string>();
    const all: NewsEvent[] = [];
    for (const e of [...mapEvents, ...gdeltEvents, ...tickerArticles]) {
      if (e?.id && !seen.has(e.id) && e.locationName !== "SYSTEM STATUS") {
        seen.add(e.id);
        all.push(e);
      }
    }
    return all;
  }, [mapEvents, gdeltEvents, tickerArticles]);

  // Search: when ?q= is present, map is filtered to search results (Google-style)
  const searchResultForMap = useMemo(() => {
    if (!searchQ) return null;
    return searchEvents(searchableEvents, searchQ);
  }, [searchableEvents, searchQ]);

  const displayMapEvents = searchResultForMap
    ? searchResultForMap.results
    : mapEvents;

  // Resolve selected single event (includes RSS regional hotspots, respects search filter)
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return displayMapEvents.find((e) => e.id === selectedEventId) ?? null;
  }, [displayMapEvents, selectedEventId]);

  // Resolve cluster region events — when search is active, this is search-filtered
  const rawRegionEvents = useMemo(() => {
    if (!regionEventIds) return null;
    // Set, not Array#includes: a big cluster against a few thousand markers is
    // otherwise a million string compares on every render.
    const wanted = new Set(regionEventIds);
    return displayMapEvents.filter((e) => wanted.has(e.id));
  }, [displayMapEvents, regionEventIds]);

  const regionEvents = useMemo(() => {
    if (!rawRegionEvents?.length) return null;
    return aggregateRegionalEvents(
      rawRegionEvents,
      displayMapEvents,
      regionQuery,
    );
  }, [rawRegionEvents, displayMapEvents, regionQuery]);

  // Region window location name (derive from search target or events)
  const regionLocationName = useMemo(() => {
    // Only a search-opened window is named after the query.
    if (regionQuery) {
      if (searchResultForMap?.primaryCountry) {
        return searchResultForMap.primaryCountry.toUpperCase();
      }
      return regionQuery.toUpperCase();
    }
    if (!regionEvents?.length) return "REGION";
    // The most specific place the cluster agrees on — a shared city, else the
    // shared state, else the dominant country. Labelling a Guwahati cluster
    // "INDIA" was true and useless.
    return mostSpecificPlaceName(
      regionEvents.filter((e) => e.locationName !== "SYSTEM STATUS"),
    ).toUpperCase();
  }, [regionEvents, searchResultForMap, regionQuery]);

  // A precomputed digest applies only when the whole region is one resolved
  // place — the same rule the cluster click uses. Mixed regions fall back to
  // the on-device synthesis.
  const regionDigest = useMemo(() => {
    if (!regionEvents?.length) return null;
    // Most specific level the whole region agrees on, matching how the panel
    // titles itself: one exact place, else one state, else one country.
    const exact = new Set(regionEvents.map((e) => e.locationName));
    if (exact.size === 1) {
      const hit = locationDigests.get([...exact][0]);
      if (hit) return hit;
    }
    const parts = regionEvents.map(placeParts);
    const admin1 = new Set(parts.map((p) => p.admin1).filter(Boolean));
    const country = new Set(parts.map((p) => p.country).filter(Boolean));
    if (admin1.size === 1 && country.size === 1) {
      const hit = locationDigests.get(`${[...admin1][0]}, ${[...country][0]}`);
      if (hit) return hit;
    }
    if (country.size === 1) {
      return locationDigests.get([...country][0]) ?? null;
    }
    return null;
  }, [regionEvents, locationDigests]);

  const handleToggleWidget = useCallback((widgetId: string) => {
    setActiveWidgets((prev) =>
      prev.includes(widgetId)
        ? prev.filter((w) => w !== widgetId)
        : [...prev, widgetId],
    );
  }, []);

  const bringToFront = useCallback((widgetId: string) => {
    setActiveWidgets((prev) => {
      if (prev.length <= 1) return prev;
      if (prev[prev.length - 1] === widgetId) return prev;
      return [...prev.filter((w) => w !== widgetId), widgetId];
    });
  }, []);

  const handleToggleLayer = useCallback(
    (category: NewsCategory) => {
      if (activeLayers.includes(category)) {
        setActiveLayers(activeLayers.filter((l) => l !== category));
      } else {
        setActiveLayers([...activeLayers, category]);
      }
    },
    [activeLayers, setActiveLayers],
  );

  const handleViewportChange = useCallback(
    (newCenter: [number, number], newZoom: number) => {
      setCenter(newCenter);
      setZoom(newZoom);
    },
    [setCenter, setZoom],
  );

  // Single marker click → HotspotCard
  const handleEventSelect = useCallback(
    (eventId: string | null, screenPos?: { x: number; y: number }) => {
      setSelectedEventId(eventId);
      setSelectedEventPos(screenPos ?? null);
      // Close region window if open
      if (eventId) {
        setRegionEventIds(null);
        setRegionPos(null);
        setRegionQuery(null);
      }
    },
    [],
  );

  // Cluster click → RegionWindow
  const handleClusterSelect = useCallback(
    (eventIds: string[], screenPos: { x: number; y: number }) => {
      setRegionEventIds(eventIds);
      setRegionPos(screenPos);
      setRegionQuery(null);
      // Close single event card
      setSelectedEventId(null);
      setSelectedEventPos(null);
    },
    [],
  );

  const handleSearchSelect = useCallback(
    (eventId: string, coords: [number, number]) => {
      setSelectedEventId(eventId);
      setSelectedEventPos(null); // no screen pos from search
      // A wire item with no resolved place has NaN coords — open it without
      // moving the map rather than flying the viewport to nowhere.
      if (Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
        setCenter(coords);
        setZoom(10);
      }
      setActiveTab("map");
    },
    [setCenter, setZoom],
  );

  const handleGeneralSelect = useCallback(
    (
      query: string,
      results: typeof mapEvents,
      bounds: SpatialBounds | null,
      primaryCountry?: string | null,
      centroid?: [number, number] | null,
    ) => {
      const canonicalQuery = primaryCountry || query;
      // Claim the query BEFORE setQ, so the ?q= effect treats it as handled.
      // Without this the effect fires on the next render and replaces this
      // entity's framing and results with a generic text search.
      // setQ truncates to 80 chars; claim the same string it will store.
      hasAutoOpenedForSearch.current = canonicalQuery.slice(0, 80);
      setRegionQuery(canonicalQuery.slice(0, 80));
      setQ(canonicalQuery);
      setActiveTab("map");
      const framing = framingFor(bounds, centroid);
      if (framing) {
        setCenter(framing.center);
        setZoom(framing.zoom);
      }
      setRegionEventIds(results.map((e) => e.id));
      setRegionPos({
        x: typeof window !== "undefined" ? window.innerWidth / 2 : 600,
        y: typeof window !== "undefined" ? window.innerHeight / 2 : 300,
      });
      setSelectedEventId(null);
      setSelectedEventPos(null);
    },
    [setQ, setCenter, setZoom],
  );

  // Auto-open RegionWindow when ?q= is present on load / change (search → window)
  useEffect(() => {
    if (!isUrlStateLoaded) return;
    if (
      !searchQ ||
      !searchResultForMap ||
      searchResultForMap.results.length === 0
    ) {
      if (!searchQ) {
        hasAutoOpenedForSearch.current = null;
        // keep existing manual region window if any; don't auto-clear on empty results
      }
      return;
    }
    if (hasAutoOpenedForSearch.current === searchQ) return;
    hasAutoOpenedForSearch.current = searchQ;
    const framing = framingFor(
      searchResultForMap.bounds,
      searchResultForMap.centroid,
    );
    if (framing) {
      setCenter(framing.center);
      setZoom(framing.zoom);
    }
    setRegionQuery(searchQ);
    setRegionEventIds(searchResultForMap.results.map((e) => e.id));
    setRegionPos({
      x: typeof window !== "undefined" ? window.innerWidth / 2 : 600,
      y: typeof window !== "undefined" ? window.innerHeight / 2 : 300,
    });
    setSelectedEventId(null);
    setSelectedEventPos(null);
    setActiveTab("map");
  }, [searchQ, searchResultForMap, isUrlStateLoaded, setCenter, setZoom]);

  useKeyboardShortcuts({
    onSearchToggle: useCallback(() => setIsSearchOpen((prev) => !prev), []),
    onLayersToggle: useCallback(() => setIsFilterOpen((prev) => !prev), []),
    onCloseActivePanel: useCallback(() => {
      setIsSearchOpen(false);
      setSelectedEventId(null);
      setSelectedEventPos(null);
      setRegionEventIds(null);
      setRegionPos(null);
      setRegionQuery(null);
      setIsLocateOpen(false);
      setIsFilterOpen(false);
      setIsSettingsOpen(false);
      setActiveWidgets([]);
      if (searchQ) setQ(null);
    }, [searchQ, setQ]),
    onWidgetToggle: handleToggleWidget,
    onSettingsToggle: useCallback(() => setIsSettingsOpen((prev) => !prev), []),
  });

  if (!isUrlStateLoaded) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-brand-bg text-slate-400 font-mono text-xs tracking-widest">
        <div className="flex flex-col items-center gap-3">
          <RadarSweep theme="dark" />
          <span>SYNCHRONIZING REGION'S TRACKER GRID...</span>
        </div>
      </div>
    );
  }

  let workspace: React.ReactNode = null;
  if (activeTab === "map") {
    workspace = (
      <MapWrapper
        events={displayMapEvents}
        selectedEventId={selectedEventId}
        onEventSelect={handleEventSelect}
        onClusterSelect={handleClusterSelect}
        center={center}
        zoom={zoom}
        onViewportChange={handleViewportChange}
        visualMode={visualMode}
        theme={settings.theme}
        minZoom={activeRegion.minZoom}
        maxBounds={activeRegion.maxBounds}
        regionId={activeRegion.id}
      />
    );
  } else if (activeTab === "wire") {
    workspace = (
      <WireWorkspace
        events={filteredEvents}
        onEventSelect={handleSearchSelect}
        theme={settings.theme}
      />
    );
  }

  return (
    <DashboardShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      layoutMode={settings.layoutMode}
      theme={settings.theme}
      timezone={settings.timezone}
      dateFormat={settings.dateFormat}
      onToggleLocate={() => {
        setIsLocateOpen((prev) => !prev);
        setIsFilterOpen(false);
        setIsSettingsOpen(false);
      }}
      onToggleFilter={() => {
        setIsFilterOpen((prev) => !prev);
        setIsLocateOpen(false);
        setIsSettingsOpen(false);
      }}
      onToggleSettings={() => {
        setIsSettingsOpen((prev) => !prev);
        setIsLocateOpen(false);
        setIsFilterOpen(false);
      }}
      onToggleSearch={() => setIsSearchOpen(true)}
      isLocateOpen={isLocateOpen}
      isFilterOpen={isFilterOpen}
      isSettingsOpen={isSettingsOpen}
      leftRail={
        <LeftControlRail
          activeWidgets={activeWidgets}
          onToggleWidget={handleToggleWidget}
          layoutMode={settings.layoutMode}
          theme={settings.theme}
          activeTab={activeTab}
        />
      }
      tickerBar={
        <BreakingTicker events={tickerArticles} theme={settings.theme} />
      }
      contentWorkspace={workspace}
      locateWidget={
        isLocateOpen ? (
          <LocateWidget
            onLocate={(coords, newZoom) => {
              setCenter(coords);
              setZoom(newZoom);
            }}
            onClose={() => setIsLocateOpen(false)}
            theme={settings.theme}
          />
        ) : undefined
      }
      filterWidget={
        isFilterOpen ? (
          <FilterWidget
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
            onClose={() => setIsFilterOpen(false)}
            theme={settings.theme}
          />
        ) : undefined
      }
      settingsWidget={
        isSettingsOpen ? (
          <SettingsWidget
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => setIsSettingsOpen(false)}
            zIndex={1100}
          />
        ) : undefined
      }
      floatingWindows={
        <>
          {/* Single event HotspotCard */}
          {selectedEvent && (
            <HotspotCard
              event={selectedEvent}
              position={selectedEventPos}
              theme={settings.theme}
              onClose={() => {
                setSelectedEventId(null);
                setSelectedEventPos(null);
              }}
            />
          )}

          {/* Region/Cluster floating window — now query-aware */}
          {regionEvents && regionEvents.length > 0 && (
            <RegionWindow
              events={regionEvents}
              locationName={regionLocationName}
              digest={regionDigest}
              query={regionQuery ?? undefined}
              theme={settings.theme}
              layoutMode={settings.layoutMode}
              onClose={() => {
                setRegionEventIds(null);
                setRegionPos(null);
                setRegionQuery(null);
                if (searchQ) setQ(null);
              }}
              defaultPosition={
                regionPos
                  ? {
                      x: Math.min(regionPos.x, window.innerWidth - 360),
                      y: Math.max(60, regionPos.y - 200),
                    }
                  : { x: 120, y: 80 }
              }
              zIndex={60}
            />
          )}

          {activeWidgets.includes("wire") && (
            <MiniWireWidget
              events={filteredEvents}
              onEventSelect={handleSearchSelect}
              onClose={() => handleToggleWidget("wire")}
              zIndex={50 + activeWidgets.indexOf("wire")}
              onFocus={() => bringToFront("wire")}
              theme={settings.theme}
              layoutMode={settings.layoutMode}
            />
          )}
          {activeWidgets.includes("stocks") && (
            <StocksWidget
              onClose={() => handleToggleWidget("stocks")}
              zIndex={50 + activeWidgets.indexOf("stocks")}
              onFocus={() => bringToFront("stocks")}
              theme={settings.theme}
              layoutMode={settings.layoutMode}
            />
          )}
          {activeWidgets.includes("streams") && (
            <StreamsWidget
              onClose={() => handleToggleWidget("streams")}
              zIndex={50 + activeWidgets.indexOf("streams")}
              onFocus={() => bringToFront("streams")}
              theme={settings.theme}
              layoutMode={settings.layoutMode}
            />
          )}
          {activeWidgets.includes("cameras") && (
            <CamerasWidget
              onClose={() => handleToggleWidget("cameras")}
              zIndex={50 + activeWidgets.indexOf("cameras")}
              onFocus={() => bringToFront("cameras")}
              theme={settings.theme}
              layoutMode={settings.layoutMode}
            />
          )}
          {activeWidgets.includes("outbreaks") && (
            <OutbreaksWidget
              events={gdeltEvents}
              onClose={() => handleToggleWidget("outbreaks")}
              zIndex={50 + activeWidgets.indexOf("outbreaks")}
              onFocus={() => bringToFront("outbreaks")}
              theme={settings.theme}
              layoutMode={settings.layoutMode}
            />
          )}
        </>
      }
      commandPalette={
        <CommandPalette
          isOpen={isSearchOpen}
          onClose={() => {
            setIsSearchOpen(false);
          }}
          events={searchableEvents}
          onEventSelect={handleSearchSelect}
          onGeneralSelect={handleGeneralSelect}
          theme={settings.theme}
        />
      }
    />
  );
}
