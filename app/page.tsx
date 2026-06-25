"use client";

import { useCallback, useMemo, useState } from "react";
import CommandPalette from "@/components/CommandPalette";
import DashboardShell from "@/components/DashboardShell";
import EventDetailsPanel from "@/components/EventDetailsPanel";
import LeftControlRail from "@/components/LeftControlRail";
import MapWrapper from "@/components/MapWrapper";
import RightInsightsPanel from "@/components/RightInsightsPanel";
import StatsBar from "@/components/StatsBar";
import { mockNewsEvents } from "@/data/mockNewsEvents";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUrlState } from "@/hooks/useUrlState";
import { filterEvents, labelForTimeRange } from "@/lib/filterEvents";
import type { NewsCategory } from "@/types/news";

export default function Home() {
  const {
    center,
    zoom,
    timeRange,
    activeLayers,
    setCenter,
    setZoom,
    setTimeRange,
    setActiveLayers,
    isUrlStateLoaded,
  } = useUrlState();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [visualMode, setVisualMode] = useState<"nodes" | "heat">("nodes");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 1. Calculate category tally based on timeRange (reflects active timeline counts)
  const eventsInTimeRange = useMemo(() => {
    return filterEvents(
      mockNewsEvents,
      ["breaking", "protests", "disasters", "politics", "economy", "tech"],
      timeRange,
    );
  }, [timeRange]);

  const eventsCountByCategory = useMemo(() => {
    const counts: Record<NewsCategory, number> = {
      breaking: 0,
      protests: 0,
      disasters: 0,
      politics: 0,
      economy: 0,
      tech: 0,
    };
    for (const e of eventsInTimeRange) {
      counts[e.category] = (counts[e.category] || 0) + 1;
    }
    return counts;
  }, [eventsInTimeRange]);

  // 2. Filter visible events (timeRange + checked layers)
  const filteredEvents = useMemo(() => {
    return filterEvents(mockNewsEvents, activeLayers, timeRange);
  }, [activeLayers, timeRange]);

  // 3. Look up currently selected event
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return filteredEvents.find((e) => e.id === selectedEventId) ?? null;
  }, [filteredEvents, selectedEventId]);

  // Layer switches
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

  const handleToggleAllLayers = useCallback(
    (enable: boolean) => {
      if (enable) {
        setActiveLayers([
          "breaking",
          "protests",
          "disasters",
          "politics",
          "economy",
          "tech",
        ]);
      } else {
        setActiveLayers([]);
      }
    },
    [setActiveLayers],
  );

  // Map viewport updates
  const handleViewportChange = useCallback(
    (newCenter: [number, number], newZoom: number) => {
      setCenter(newCenter);
      setZoom(newZoom);
    },
    [setCenter, setZoom],
  );

  const handleEventSelect = useCallback((eventId: string | null) => {
    setSelectedEventId(eventId);
  }, []);

  const handleSearchSelect = useCallback(
    (eventId: string, coords: [number, number]) => {
      setSelectedEventId(eventId);
      setCenter(coords);
      setZoom(12); // Focus in close
    },
    [setCenter, setZoom],
  );

  // Keyboard layout hotkeys hook
  useKeyboardShortcuts({
    onSearchToggle: useCallback(() => setIsSearchOpen((prev) => !prev), []),
    onLayersToggle: useCallback(() => {
      if (activeLayers.length === 0) {
        handleToggleAllLayers(true);
      } else {
        handleToggleAllLayers(false);
      }
    }, [activeLayers, handleToggleAllLayers]),
    onCloseActivePanel: useCallback(() => {
      setIsSearchOpen(false);
      setSelectedEventId(null);
    }, []),
  });

  if (!isUrlStateLoaded) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-brand-bg text-slate-400 font-mono text-xs tracking-widest">
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-cyan-500 animate-spin" />
          <span>SYNCHRONIZING SYSTEM REGISTRIES...</span>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      leftRail={
        <LeftControlRail
          activeLayers={activeLayers}
          onToggleLayer={handleToggleLayer}
          onToggleAll={handleToggleAllLayers}
          visualMode={visualMode}
          onChangeVisualMode={setVisualMode}
          onOpenSearch={() => setIsSearchOpen(true)}
          eventsCountByCategory={eventsCountByCategory}
        />
      }
      statsBar={
        <StatsBar
          events={filteredEvents}
          timeRangeLabel={labelForTimeRange(timeRange)}
        />
      }
      map={
        <MapWrapper
          events={filteredEvents}
          selectedEventId={selectedEventId}
          onEventSelect={handleEventSelect}
          center={center}
          zoom={zoom}
          onViewportChange={handleViewportChange}
          visualMode={visualMode}
        />
      }
      insightsPanel={
        <RightInsightsPanel
          events={filteredEvents}
          selectedEventId={selectedEventId}
          onEventSelect={handleSearchSelect}
        />
      }
      detailsPanel={
        selectedEventId ? (
          <EventDetailsPanel
            event={selectedEvent}
            onClose={() => handleEventSelect(null)}
            onFocusOnMap={(coords) => {
              setCenter(coords);
              setZoom(13);
            }}
          />
        ) : undefined
      }
      commandPalette={
        <CommandPalette
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          events={mockNewsEvents}
          onEventSelect={handleSearchSelect}
        />
      }
    />
  );
}
