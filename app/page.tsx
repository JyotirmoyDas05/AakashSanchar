"use client";

import { useMemo, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import EventDetailsPanel from "@/components/EventDetailsPanel";
import FilterBar from "@/components/FilterBar";
import MapWrapper from "@/components/MapWrapper";
import StatsBar from "@/components/StatsBar";
import { mockNewsEvents } from "@/data/mockNewsEvents";
import {
  filterEvents,
  labelForCategory,
  labelForTimeRange,
} from "@/lib/filterEvents";
import type { NewsCategory, TimeRange } from "@/types/news";

export default function Home() {
  const [category, setCategory] = useState<NewsCategory | "all">("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const filteredEvents = useMemo(
    () => filterEvents(mockNewsEvents, category, timeRange),
    [category, timeRange],
  );

  const selectedEvent = useMemo(
    () => filteredEvents.find((e) => e.id === selectedEventId) ?? null,
    [filteredEvents, selectedEventId],
  );

  return (
    <DashboardShell
      title="Heatmap Explorer"
      subtitle="Interactive news event map of major Indian cities"
      filterBar={
        <FilterBar
          category={category}
          timeRange={timeRange}
          onCategoryChange={setCategory}
          onTimeRangeChange={setTimeRange}
        />
      }
      statsBar={
        <StatsBar
          totalEvents={filteredEvents.length}
          categoryLabel={labelForCategory(category)}
          timeRangeLabel={labelForTimeRange(timeRange)}
        />
      }
      map={
        <MapWrapper
          events={filteredEvents}
          onEventSelect={setSelectedEventId}
        />
      }
      detailsPanel={
        <EventDetailsPanel
          event={selectedEvent}
          onClose={() => setSelectedEventId(null)}
        />
      }
    />
  );
}
