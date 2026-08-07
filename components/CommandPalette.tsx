"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  extractDynamicEntities,
  getCountryFlagImgUrl,
  type LocationEntity,
  type SpatialBounds,
  searchAllEntities,
  type TopicEntity,
} from "@/lib/search";
import { BUCKET_COLOR, bucketForTag } from "@/lib/tagPalette";
import type { NewsCategory, NewsEvent } from "@/types/news";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  events: NewsEvent[];
  onEventSelect: (eventId: string, coords: [number, number]) => void;
  onGeneralSelect?: (
    query: string,
    results: NewsEvent[],
    bounds: SpatialBounds | null,
    primaryCountry: string | null,
  ) => void;
  theme?: "dark" | "light";
}

function highlight(text: string, tokens: string[]): React.ReactNode {
  if (!tokens.length) return text;
  const lower = text.toLowerCase();
  let last = 0;
  const parts: React.ReactNode[] = [];
  const hits: Array<{ s: number; e: number }> = [];

  for (const tok of tokens) {
    let idx = lower.indexOf(tok);
    while (idx !== -1) {
      hits.push({ s: idx, e: idx + tok.length });
      idx = lower.indexOf(tok, idx + 1);
    }
  }

  if (!hits.length) return text;
  hits.sort((a, b) => a.s - b.s);

  const merged: typeof hits = [];
  for (const h of hits) {
    const lastM = merged[merged.length - 1];
    if (lastM && h.s <= lastM.e) lastM.e = Math.max(lastM.e, h.e);
    else merged.push({ ...h });
  }

  for (const h of merged) {
    if (h.s > last) parts.push(text.slice(last, h.s));
    parts.push(
      <mark
        key={`${h.s}-${h.e}`}
        className="bg-cyan-400/30 text-cyan-300 rounded px-0.5"
      >
        {text.slice(h.s, h.e)}
      </mark>,
    );
    last = h.e;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

const CATEGORY_CHIPS: Array<{ id: NewsCategory | "all"; label: string }> = [
  { id: "all", label: "ALL" },
  { id: "conflict", label: "CONFLICT" },
  { id: "disaster", label: "DISASTER" },
  { id: "health", label: "HEALTH" },
  { id: "space", label: "SPACE" },
  { id: "news", label: "NEWS" },
];

type FlatItem =
  | { type: "location"; data: LocationEntity }
  | { type: "topic"; data: TopicEntity }
  | {
      type: "global";
      query: string;
      events: NewsEvent[];
      bounds: SpatialBounds | null;
      country: string | null;
    }
  | { type: "event"; data: NewsEvent };

export default function CommandPalette({
  isOpen,
  onClose,
  events,
  onEventSelect,
  onGeneralSelect,
  theme = "dark",
}: CommandPaletteProps) {
  const isLight = theme === "light";
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    NewsCategory | "all"
  >("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedCategory("all");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const categoryFilteredEvents = useMemo(() => {
    if (selectedCategory === "all") return events;
    return events.filter(
      (e) => (e.category || bucketForTag(e.tag)) === selectedCategory,
    );
  }, [events, selectedCategory]);

  // Dynamic entity extraction
  const dynamicEntities = useMemo(() => {
    return extractDynamicEntities(categoryFilteredEvents);
  }, [categoryFilteredEvents]);

  // Dynamic structured search
  const structuredResult = useMemo(() => {
    if (!search.trim()) return null;
    return searchAllEntities(categoryFilteredEvents, search);
  }, [categoryFilteredEvents, search]);

  const tokens = structuredResult?.tokens ?? [];

  // Flatten searchable items for indexed keyboard navigation
  const flatItems: FlatItem[] = useMemo(() => {
    if (!structuredResult) {
      // Default view when input is empty: top dynamic locations and recent events
      const topLocations = dynamicEntities.locations.slice(0, 5);
      const topTopics = dynamicEntities.topics.slice(0, 4);
      const recent = categoryFilteredEvents.slice(0, 30);

      const items: FlatItem[] = [];
      for (const loc of topLocations)
        items.push({ type: "location", data: loc });
      for (const top of topTopics) items.push({ type: "topic", data: top });
      for (const ev of recent) items.push({ type: "event", data: ev });
      return items;
    }

    const items: FlatItem[] = [];
    for (const loc of structuredResult.locations) {
      items.push({ type: "location", data: loc });
    }
    for (const top of structuredResult.topics) {
      items.push({ type: "topic", data: top });
    }
    if (structuredResult.events.length > 0) {
      items.push({
        type: "global",
        query: structuredResult.query,
        events: structuredResult.events,
        bounds: structuredResult.globalBounds,
        country: structuredResult.primaryCountry,
      });
    }
    for (const ev of structuredResult.events) {
      items.push({ type: "event", data: ev });
    }
    return items;
  }, [structuredResult, dynamicEntities, categoryFilteredEvents]);

  const totalItems = flatItems.length;

  useEffect(() => {
    if (scrollContainerRef.current) {
      const selectedEl = scrollContainerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement | null;

      if (selectedEl) {
        const container = scrollContainerRef.current;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elemTop = selectedEl.offsetTop;
        const elemBottom = elemTop + selectedEl.clientHeight;

        if (elemTop < containerTop) {
          container.scrollTop = elemTop;
        } else if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight;
        }
      }
    }
  }, [selectedIndex]);

  const handleSelectItem = useCallback(
    (item: FlatItem) => {
      if (item.type === "location") {
        if (onGeneralSelect) {
          const matched = categoryFilteredEvents.filter((e) =>
            item.data.eventIds.includes(e.id),
          );
          onGeneralSelect(
            item.data.name,
            matched.length ? matched : categoryFilteredEvents,
            item.data.bounds,
            item.data.name,
          );
        }
        onClose();
      } else if (item.type === "topic") {
        if (onGeneralSelect) {
          const matched = categoryFilteredEvents.filter((e) =>
            item.data.eventIds.includes(e.id),
          );
          onGeneralSelect(
            item.data.name,
            matched.length ? matched : categoryFilteredEvents,
            item.data.bounds,
            null,
          );
        }
        onClose();
      } else if (item.type === "global") {
        if (onGeneralSelect) {
          onGeneralSelect(item.query, item.events, item.bounds, item.country);
        }
        onClose();
      } else if (item.type === "event") {
        onEventSelect(item.data.id, [item.data.lat, item.data.lng]);
        onClose();
      }
    },
    [categoryFilteredEvents, onGeneralSelect, onEventSelect, onClose],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + totalItems) % Math.max(1, totalItems),
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          handleSelectItem(flatItems[selectedIndex]);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, totalItems, handleSelectItem]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-start justify-center bg-black/50 pt-[10dvh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 slide-in-from-top-4 ${
          isLight
            ? "border-slate-300 bg-white text-slate-900"
            : "border-brand-border bg-[#0b101c]/95 text-slate-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          className={`flex items-center border-b px-4 py-3 ${
            isLight ? "border-slate-200" : "border-brand-border"
          }`}
        >
          <svg
            className={`h-5 w-5 mr-3 ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={`flex-1 bg-transparent text-sm outline-none ${
              isLight
                ? "text-slate-900 placeholder-slate-500"
                : "text-slate-100 placeholder-slate-500"
            }`}
            placeholder="Search regions, cities, topics, tactical reports... (e.g. Nepal, UK, Tehran)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div
            className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${
              isLight
                ? "bg-slate-100 text-slate-700 border-slate-300"
                : "bg-brand-border text-slate-400 border-slate-700"
            }`}
          >
            ESC
          </div>
        </div>

        {/* Category Pills & Suggested Dynamic Hotspots */}
        <div
          className={`flex items-center justify-between px-3 py-2 border-b text-[10px] font-mono flex-wrap gap-1 ${
            isLight
              ? "bg-slate-50 border-slate-200"
              : "bg-black/20 border-brand-border"
          }`}
        >
          <div className="flex items-center gap-1">
            {CATEGORY_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(chip.id);
                  setSelectedIndex(0);
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  selectedCategory === chip.id
                    ? isLight
                      ? "bg-cyan-600 text-white font-bold"
                      : "bg-cyan-500 text-slate-950 font-bold"
                    : isLight
                      ? "text-slate-600 hover:bg-slate-200"
                      : "text-slate-400 hover:bg-white/10"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Dynamic Top Location Suggestions */}
          {dynamicEntities.locations.length > 0 && !search.trim() && (
            <div className="flex items-center gap-1 text-[9px] text-slate-500 truncate">
              <span>Hotspots:</span>
              {dynamicEntities.locations.slice(0, 4).map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setSearch(loc.name)}
                  className={`px-1.5 py-0.5 rounded border transition-colors ${
                    isLight
                      ? "bg-white text-slate-700 border-slate-300 hover:border-cyan-500"
                      : "bg-white/5 text-slate-300 border-white/10 hover:border-cyan-400"
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results List */}
        <div
          ref={scrollContainerRef}
          className="max-h-96 overflow-y-auto p-2 space-y-1"
        >
          {flatItems.length === 0 ? (
            <div
              className={`py-8 text-center text-sm font-mono space-y-2 ${
                isLight ? "text-slate-500" : "text-slate-500"
              }`}
            >
              <div>NO MATCHING CORRELATIONS DETECTED</div>
              <div className="text-[11px]">
                Try adjusting your search terms or switching category to ALL.
              </div>
            </div>
          ) : (
            <>
              {/* Section 1: Locations */}
              {flatItems.some((i) => i.type === "location") && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                    Locations & Regions
                  </div>
                  {flatItems.map((item, idx) => {
                    if (item.type !== "location") return null;
                    const isSelected = idx === selectedIndex;
                    const loc = item.data;
                    const bucket = bucketForTag(loc.dominantCategory);
                    const color = BUCKET_COLOR[bucket] || "#06b6d4";
                    const flagUrl =
                      getCountryFlagImgUrl(loc.name) ||
                      getCountryFlagImgUrl(loc.fullName);

                    return (
                      <div
                        key={loc.id}
                        data-index={idx}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors ${
                          isSelected
                            ? isLight
                              ? "bg-cyan-50 text-cyan-950 border border-cyan-400 shadow-sm"
                              : "bg-cyan-500/20 text-white border border-cyan-400/60"
                            : isLight
                              ? "hover:bg-slate-100 border border-transparent"
                              : "hover:bg-white/5 border border-transparent"
                        }`}
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="h-2 w-2 rounded-full shrink-0 animate-pulse"
                            style={{ backgroundColor: color }}
                          />
                          {flagUrl ? (
                            /* biome-ignore lint/performance/noImgElement: flag icon */
                            <img
                              src={flagUrl}
                              alt={loc.name}
                              className="h-3 w-4.5 object-cover rounded-xs border border-white/20 shrink-0"
                              onError={(e) => {
                                (
                                  e.currentTarget as HTMLImageElement
                                ).style.display = "none";
                              }}
                            />
                          ) : (
                            <svg
                              className="w-3.5 h-3.5 shrink-0 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          )}
                          <div className="truncate">
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {tokens.length
                                ? highlight(loc.fullName, tokens)
                                : loc.fullName}
                            </span>
                            <span className="ml-2 text-[10px] text-slate-500 font-mono">
                              ({loc.lat.toFixed(2)}, {loc.lng.toFixed(2)})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              isLight
                                ? "bg-slate-100 border-slate-300 text-slate-700"
                                : "bg-black/40 border-white/10 text-slate-300"
                            }`}
                          >
                            {loc.eventCount} REPORTS
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400">
                            ↵ ZOOM
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Section 2: Topics */}
              {flatItems.some((i) => i.type === "topic") && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                    Tactical Topics & Threats
                  </div>
                  {flatItems.map((item, idx) => {
                    if (item.type !== "topic") return null;
                    const isSelected = idx === selectedIndex;
                    const top = item.data;
                    const bucket = bucketForTag(top.category);
                    const color = BUCKET_COLOR[bucket] || "#eab308";

                    return (
                      <div
                        key={top.id}
                        data-index={idx}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors ${
                          isSelected
                            ? isLight
                              ? "bg-cyan-50 text-cyan-950 border border-cyan-400 shadow-sm"
                              : "bg-cyan-500/20 text-white border border-cyan-400/60"
                            : isLight
                              ? "hover:bg-slate-100 border border-transparent"
                              : "hover:bg-white/5 border border-transparent"
                        }`}
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-semibold uppercase tracking-wider truncate">
                            {tokens.length
                              ? highlight(top.name, tokens)
                              : top.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              isLight
                                ? "bg-slate-100 border-slate-300 text-slate-700"
                                : "bg-black/40 border-white/10 text-slate-300"
                            }`}
                          >
                            {top.eventCount} EVENTS
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400">
                            ↵ FILTER
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Section 3: Global search */}
              {flatItems.some((i) => i.type === "global") && (
                <div className="mb-2">
                  {flatItems.map((item, idx) => {
                    if (item.type !== "global") return null;
                    const isSelected = idx === selectedIndex;

                    return (
                      <div
                        key="global-search-action"
                        data-index={idx}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg p-2.5 border transition-colors ${
                          isSelected
                            ? isLight
                              ? "bg-cyan-50 text-cyan-950 border-cyan-400 shadow-sm"
                              : "bg-cyan-500/20 text-white border-cyan-400/60"
                            : isLight
                              ? "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
                              : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"
                        }`}
                        onClick={() => handleSelectItem(item)}
                      >
                        {/* Static Globe Icon */}
                        <svg
                          className="w-4 h-4 text-cyan-400 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2 12h20"
                          />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold uppercase tracking-wider truncate">
                            GLOBAL SEARCH: “{item.query.toUpperCase()}” —{" "}
                            {item.events.length} REPORTS
                          </div>
                          <div
                            className={`text-[10px] truncate ${
                              isLight ? "text-slate-600" : "text-slate-400"
                            }`}
                          >
                            Search related Info Regarding this Query
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isLight
                              ? "bg-white border-slate-200 text-slate-600"
                              : "bg-black/30 border-white/10 text-slate-300"
                          }`}
                        >
                          ↵ OPEN
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Section 4: News reports */}
              {flatItems.some((i) => i.type === "event") && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                    Intelligence Reports & Wire Dispatches
                  </div>
                  {flatItems.map((item, idx) => {
                    if (item.type !== "event") return null;
                    const isSelected = idx === selectedIndex;
                    const ev = item.data;
                    const bucket = bucketForTag(ev.tag ?? ev.category);
                    const dotColor = BUCKET_COLOR[bucket] || "#94a3b8";

                    return (
                      <div
                        key={ev.id}
                        data-index={idx}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg p-2.5 transition-colors ${
                          isSelected
                            ? isLight
                              ? "bg-cyan-100 text-cyan-950 border border-cyan-400 font-bold shadow-sm"
                              : "bg-brand-border text-white border border-brand-border-glow/50"
                            : isLight
                              ? "text-slate-800 hover:bg-slate-100 border border-transparent"
                              : "text-slate-300 hover:bg-brand-border/40 border border-transparent"
                        }`}
                        onClick={() => handleSelectItem(item)}
                      >
                        <div
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`truncate text-[11px] font-semibold uppercase tracking-wider ${
                                isLight
                                  ? "text-slate-600 font-bold"
                                  : "text-slate-400"
                              }`}
                            >
                              {(ev.tag ?? ev.category).toUpperCase()} •{" "}
                              {ev.locationName}
                            </span>
                            <span
                              className={`shrink-0 font-mono text-[9px] ${
                                isLight
                                  ? "text-slate-600 font-bold"
                                  : "text-slate-500"
                              }`}
                            >
                              {ev.lat.toFixed(2)}, {ev.lng.toFixed(2)}
                            </span>
                          </div>
                          <h4
                            className={`mt-0.5 text-xs font-semibold truncate ${
                              isLight ? "text-slate-900" : "text-slate-100"
                            }`}
                          >
                            {tokens.length
                              ? highlight(ev.title, tokens)
                              : ev.title}
                          </h4>
                          <p
                            className={`mt-0.5 text-[11px] line-clamp-1 ${
                              isLight ? "text-slate-600" : "text-slate-400"
                            }`}
                          >
                            {tokens.length
                              ? highlight(ev.description, tokens)
                              : ev.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between border-t px-4 py-2 text-[10px] font-mono ${
            isLight
              ? "bg-slate-100 border-slate-200 text-slate-700 font-bold"
              : "bg-[#080d17] border-brand-border text-slate-500"
          }`}
        >
          <span>
            {search.trim()
              ? `SHOWING ${flatItems.length} CORRELATIONS`
              : `INDEXED ${dynamicEntities.locations.length} REGIONS • ${categoryFilteredEvents.length} REPORTS`}
          </span>
          <div className="flex gap-2">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
