"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { NewsCategory } from "@/types/news";

export default function Home() {
  const {
    center,
    zoom,
    timeRange,
    activeLayers,
    setCenter,
    setZoom,
    setActiveLayers,
    isUrlStateLoaded,
  } = useUrlState();

  const [activeTab, setActiveTab] = useState<"map" | "wire">("map");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventPos, setSelectedEventPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Region window: multiple events for a cluster
  const [regionEventIds, setRegionEventIds] = useState<string[] | null>(null);
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
  const { articles: tickerArticles } = useGdeltArticles();

  const filteredEvents = useMemo(() => {
    return filterEvents(gdeltEvents, activeLayers, timeRange);
  }, [gdeltEvents, activeLayers, timeRange]);

  // Resolve selected single event
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return filteredEvents.find((e) => e.id === selectedEventId) ?? null;
  }, [filteredEvents, selectedEventId]);

  // Resolve cluster region events
  const regionEvents = useMemo(() => {
    if (!regionEventIds) return null;
    return filteredEvents.filter((e) => regionEventIds.includes(e.id));
  }, [filteredEvents, regionEventIds]);

  // Region window location name (derive from events)
  const regionLocationName = useMemo(() => {
    if (!regionEvents?.length) return "REGION";
    const loc = regionEvents[0].locationName;
    // Extract country portion (last part after comma)
    const parts = loc.split(",");
    return (parts[parts.length - 1]?.trim() || loc).toUpperCase();
  }, [regionEvents]);

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
      }
    },
    [],
  );

  // Cluster click → RegionWindow
  const handleClusterSelect = useCallback(
    (eventIds: string[], screenPos: { x: number; y: number }) => {
      setRegionEventIds(eventIds);
      setRegionPos(screenPos);
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
      setCenter(coords);
      setZoom(10);
      setActiveTab("map");
    },
    [setCenter, setZoom],
  );

  useKeyboardShortcuts({
    onSearchToggle: useCallback(() => setIsSearchOpen((prev) => !prev), []),
    onLayersToggle: useCallback(() => setIsFilterOpen((prev) => !prev), []),
    onCloseActivePanel: useCallback(() => {
      setIsSearchOpen(false);
      setSelectedEventId(null);
      setSelectedEventPos(null);
      setRegionEventIds(null);
      setRegionPos(null);
      setIsLocateOpen(false);
      setIsFilterOpen(false);
      setIsSettingsOpen(false);
      setActiveWidgets([]);
    }, []),
    onWidgetToggle: handleToggleWidget,
    onSettingsToggle: useCallback(() => setIsSettingsOpen((prev) => !prev), []),
  });

  if (!isUrlStateLoaded) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-brand-bg text-slate-400 font-mono text-xs tracking-widest">
        <div className="flex flex-col items-center gap-3">
          <RadarSweep theme="dark" />
          <span>SYNCHRONIZING WORLD TRACKER GRID...</span>
        </div>
      </div>
    );
  }

  let workspace: React.ReactNode = null;
  if (activeTab === "map") {
    workspace = (
      <MapWrapper
        events={filteredEvents}
        selectedEventId={selectedEventId}
        onEventSelect={handleEventSelect}
        onClusterSelect={handleClusterSelect}
        center={center}
        zoom={zoom}
        onViewportChange={handleViewportChange}
        visualMode={visualMode}
        theme={settings.theme}
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

          {/* Region/Cluster floating window */}
          {regionEvents && regionEvents.length > 0 && (
            <RegionWindow
              events={regionEvents}
              locationName={regionLocationName}
              theme={settings.theme}
              layoutMode={settings.layoutMode}
              onClose={() => {
                setRegionEventIds(null);
                setRegionPos(null);
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
          onClose={() => setIsSearchOpen(false)}
          events={gdeltEvents}
          onEventSelect={handleSearchSelect}
          theme={settings.theme}
        />
      }
    />
  );
}
