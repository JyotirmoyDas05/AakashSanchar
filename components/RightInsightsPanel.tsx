"use client";

import { labelForCategory } from "@/lib/filterEvents";
import { formatTime } from "@/lib/formatTime";
import type { NewsCategory, NewsEvent } from "@/types/news";

interface RightInsightsPanelProps {
  events: NewsEvent[];
  onEventSelect: (eventId: string, coords: [number, number]) => void;
  selectedEventId: string | null;
}

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  breaking: "bg-cat-breaking",
  protests: "bg-cat-protests",
  disasters: "bg-cat-disasters",
  politics: "bg-cat-politics",
  economy: "bg-cat-economy",
  tech: "bg-cat-tech",
};

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  breaking: "Breaking",
  protests: "Protests",
  disasters: "Disasters",
  politics: "Politics",
  economy: "Economy",
  tech: "Tech",
};

export default function RightInsightsPanel({
  events,
  onEventSelect,
  selectedEventId,
}: RightInsightsPanelProps) {
  const total = events.length;

  // 1. Calculate category distribution
  const categoryCounts = events.reduce(
    (acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    },
    {} as Record<NewsCategory, number>,
  );

  const categoryDistribution = Object.keys(CATEGORY_LABELS)
    .map((catKey) => {
      const cat = catKey as NewsCategory;
      const count = categoryCounts[cat] || 0;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        count,
        percentage,
        color: CATEGORY_COLORS[cat],
      };
    })
    .sort((a, b) => b.count - a.count);

  // 2. Calculate top hotspots (grouped by locationName)
  const locationCounts = events.reduce(
    (acc, curr) => {
      acc[curr.locationName] = (acc[curr.locationName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topHotspots = Object.entries(locationCounts)
    .map(([location, count]) => {
      // Find coordinates of first matching event for navigation
      const firstEvent = events.find((e) => e.locationName === location);
      return {
        location,
        count,
        lat: firstEvent?.lat ?? 0,
        lng: firstEvent?.lng ?? 0,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // 3. Get recent updates (sorted by publishedAt descending)
  const recentUpdates = [...events]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="flex h-full w-[300px] flex-col border-l border-brand-border bg-[#070b13] p-4 text-slate-300 select-none">
      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {/* Category Breakdown */}
        <section>
          <h3 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            SECTOR DISTRIBUTION
          </h3>
          {total === 0 ? (
            <div className="py-4 text-center text-xs text-slate-600 font-mono italic">
              NO SIGNAL DATA AVAILABLE
            </div>
          ) : (
            <div className="space-y-3">
              {categoryDistribution.map((item) => {
                if (item.count === 0) return null;
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">
                        {item.label}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {item.count} ({item.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    {/* Progress indicator */}
                    <div className="h-1.5 rounded bg-brand-border overflow-hidden">
                      <div
                        className={`h-full rounded ${item.color}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Hotspots Section */}
        <section className="border-t border-brand-border/50 pt-4">
          <h3 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
            CONCENTRATION HOTSPOTS
          </h3>
          {topHotspots.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-600 font-mono italic">
              NO HOTSPOTS LOCATED
            </div>
          ) : (
            <div className="space-y-1.5">
              {topHotspots.map((h, i) => (
                <button
                  key={h.location}
                  type="button"
                  onClick={() => onEventSelect("", [h.lat, h.lng])}
                  className="flex items-center justify-between w-full rounded border border-brand-border/40 bg-[#0d1423]/30 px-2.5 py-1.5 text-left text-xs text-slate-400 hover:bg-brand-border/50 hover:text-white transition-all group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[10px] text-slate-600 font-bold">
                      0{i + 1}
                    </span>
                    <span className="truncate font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors">
                      {h.location}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 bg-[#090d16] px-1.5 rounded border border-brand-border/60">
                    {h.count} pings
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent Ticker list */}
        <section className="border-t border-brand-border/50 pt-4">
          <h3 className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
            TELEMETRY UPDATES
          </h3>
          {recentUpdates.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-600 font-mono italic">
              NO INCIDENT INCOMING
            </div>
          ) : (
            <div className="space-y-2">
              {recentUpdates.map((ev) => {
                const isSelected = ev.id === selectedEventId;
                let dotColor = "bg-slate-500";
                if (ev.category === "breaking") dotColor = "bg-cat-breaking";
                else if (ev.category === "protests")
                  dotColor = "bg-cat-protests";
                else if (ev.category === "disasters")
                  dotColor = "bg-cat-disasters";
                else if (ev.category === "politics")
                  dotColor = "bg-cat-politics";
                else if (ev.category === "economy") dotColor = "bg-cat-economy";
                else if (ev.category === "tech") dotColor = "bg-cat-tech";

                return (
                  <div
                    key={ev.id}
                    onClick={() => onEventSelect(ev.id, [ev.lat, ev.lng])}
                    className={`group cursor-pointer rounded border p-2 text-left transition-all ${
                      isSelected
                        ? "border-[#2b3e63] bg-[#0d1423] shadow-md"
                        : "border-brand-border/40 bg-transparent hover:bg-brand-border/30 hover:border-brand-border/70"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                        />
                        <span className="uppercase tracking-wider font-bold truncate max-w-[80px]">
                          {labelForCategory(ev.category)}
                        </span>
                      </div>
                      <span>{formatTime(ev.publishedAt)}</span>
                    </div>
                    <h4
                      className={`mt-1 text-xs font-semibold leading-tight line-clamp-2 transition-colors ${
                        isSelected
                          ? "text-cyan-400"
                          : "text-slate-300 group-hover:text-slate-100"
                      }`}
                    >
                      {ev.title}
                    </h4>
                    <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-slate-500">
                      <span>{ev.locationName}</span>
                      <span>{(ev.intensity * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
