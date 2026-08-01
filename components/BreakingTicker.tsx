"use client";

import { useRef, useState } from "react";
import { formatTime } from "@/lib/formatTime";
import type { NewsCategory, NewsEvent } from "@/types/news";

interface BreakingTickerProps {
  events: NewsEvent[];
  theme?: "dark" | "light";
}

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  news: "text-cat-news",
  conflict: "text-cat-conflict",
  disaster: "text-cat-disaster",
  health: "text-cat-health",
  space: "text-cat-space",
};

const CATEGORY_ACCENT_BG: Record<NewsCategory, string> = {
  news: "bg-cat-news",
  conflict: "bg-cat-conflict",
  disaster: "bg-cat-disaster",
  health: "bg-cat-health",
  space: "bg-cat-space",
};

export default function BreakingTicker({
  events,
  theme = "dark",
}: BreakingTickerProps) {
  const isLight = theme === "light";
  const [hoveredEvent, setHoveredEvent] = useState<NewsEvent | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
  } | null>(null);
  const [isMarqueeHovered, setIsMarqueeHovered] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isPaused = isMarqueeHovered || isTooltipHovered;

  // system status events when no live feeds
  const mockSystemEvents: NewsEvent[] = [
    {
      id: "sys-1",
      title: "AEGIS TELEMETRY GRID COMPILING...",
      description:
        "Initializing satellite downlinks and compiling core database files.",
      source: "#",
      category: "news",
      publishedAt: new Date().toISOString(),
      locationName: "SYSTEM STATUS",
      lat: 0,
      lng: 0,
      intensity: 1,
    },
    {
      id: "sys-2",
      title: "SATELLITE DOWNLINKS SYNCHRONIZED...",
      description:
        "All space-based sensor platforms report operational readiness.",
      source: "#",
      category: "news",
      publishedAt: new Date().toISOString(),
      locationName: "SYSTEM STATUS",
      lat: 0,
      lng: 0,
      intensity: 1,
    },
    {
      id: "sys-3",
      title: "WAITING FOR DETECTOR PINGS...",
      description: "Listening on GDELT wire and global news stream protocols.",
      source: "#",
      category: "news",
      publishedAt: new Date().toISOString(),
      locationName: "SYSTEM STATUS",
      lat: 0,
      lng: 0,
      intensity: 1,
    },
  ];

  // Show system placeholder events until real articles arrive
  const displayEvents = events.length > 0 ? events : mockSystemEvents;

  const handleMarqueeMouseEnter = () => {
    if (isMarqueeHovered) return;
    setIsMarqueeHovered(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleMarqueeMouseLeave = () => {
    setIsMarqueeHovered(false);
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredEvent(null);
      setTooltipPosition(null);
    }, 180);
  };

  // handles mouse enter on ticker item
  const handleItemMouseEnter = (
    event: NewsEvent,
    e: React.MouseEvent<HTMLSpanElement>,
  ) => {
    if (event.locationName === "SYSTEM STATUS" || event.source === "system")
      return;
    if (hoveredEvent?.id === event.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const parentEl = e.currentTarget.closest(".ticker-container");
    if (parentEl) {
      const parentRect = parentEl.getBoundingClientRect();
      const left = rect.left - parentRect.left + rect.width / 2;
      const tooltipWidth = 460;
      const padding = 16;
      const minLeft = tooltipWidth / 2 + padding;
      const maxLeft = parentRect.width - tooltipWidth / 2 - padding;
      const clampedLeft = Math.max(minLeft, Math.min(maxLeft, left));
      setTooltipPosition({ left: clampedLeft });
    }
    setHoveredEvent(event);
  };

  const handleTooltipMouseEnter = () => {
    if (isTooltipHovered) return;
    setIsTooltipHovered(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    setIsTooltipHovered(false);
    setHoveredEvent(null);
    setTooltipPosition(null);
  };

  return (
    <div
      className={`ticker-container relative h-7 border-t flex items-center z-2000 select-none font-mono text-[10px] shrink-0 ${
        isLight
          ? "bg-white border-slate-200 text-slate-800 shadow-sm"
          : "bg-brand-bg border-brand-border text-brand-text-secondary"
      }`}
    >
      {/* Red Alert static block on the left */}
      <div
        className={`font-bold border-r px-3 h-full flex items-center gap-1.5 shrink-0 select-none text-[9px] tracking-widest uppercase z-10 ${
          isLight
            ? "bg-red-50 text-red-600 border-slate-200 font-bold"
            : "bg-red-950/20 text-red-500 border-brand-border"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
        LIVE
      </div>

      {/* Marquee scroll block */}
      <div
        className="flex-1 overflow-hidden relative flex items-center h-full"
        onMouseEnter={handleMarqueeMouseEnter}
        onMouseLeave={handleMarqueeMouseLeave}
      >
        <div
          className={`animate-marquee whitespace-nowrap inline-flex ${
            isLight ? "text-slate-800" : "text-brand-text-secondary"
          }`}
          style={{
            animationDuration: `${Math.max(60, displayEvents.length * 15)}s`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {/* First loop block */}
          <span className="inline-flex items-center shrink-0">
            {displayEvents.map((e) => (
              <span
                key={`${e.id}-loop1`}
                className={`inline-flex items-center cursor-pointer transition-colors ${
                  isLight ? "hover:text-cyan-800" : "hover:text-white"
                }`}
                onMouseEnter={(evt) => handleItemMouseEnter(e, evt)}
              >
                <span
                  className={`${
                    CATEGORY_COLORS[e.category] ||
                    (isLight ? "text-slate-600" : "text-brand-text-secondary")
                  } font-bold select-none text-[9px] tracking-wide mr-1.5`}
                >
                  {e.locationName && e.locationName !== "SYSTEM STATUS"
                    ? `[${e.category.toUpperCase()} · ${e.locationName.toUpperCase()}]`
                    : `[${e.category.toUpperCase()}]`}
                </span>
                <span
                  className={
                    isLight ? "text-slate-900 font-bold" : "text-slate-350"
                  }
                >
                  {e.title.toUpperCase()}
                </span>
                <span className="text-brand-border font-mono select-none px-4">
                  •
                </span>
              </span>
            ))}
          </span>

          {/* Second loop block for seamless animation */}
          <span className="inline-flex items-center shrink-0">
            {displayEvents.map((e) => (
              <span
                key={`${e.id}-loop2`}
                className="inline-flex items-center cursor-pointer hover:text-white transition-colors"
                onMouseEnter={(evt) => handleItemMouseEnter(e, evt)}
              >
                <span
                  className={`${CATEGORY_COLORS[e.category] || "text-brand-text-secondary"} font-bold select-none text-[9px] tracking-wide mr-1.5`}
                >
                  {e.locationName && e.locationName !== "SYSTEM STATUS"
                    ? `[${e.category.toUpperCase()} · ${e.locationName.toUpperCase()}]`
                    : `[${e.category.toUpperCase()}]`}
                </span>
                <span className="text-slate-350">{e.title.toUpperCase()}</span>
                <span className="text-brand-border font-mono select-none px-4">
                  •
                </span>
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* Hover Modal */}
      {hoveredEvent && tooltipPosition && (
        <div
          style={{ left: tooltipPosition.left }}
          className={`absolute bottom-full mb-3 -translate-x-1/2 rounded-lg z-2100 shadow-2xl w-115 pointer-events-auto flex flex-col transition-all duration-150 overflow-hidden font-mono border ${
            isLight
              ? "bg-white/98 text-slate-900 border-slate-300 shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
              : "bg-brand-panel backdrop-blur-xl border-brand-border text-brand-text-primary shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.05)]"
          }`}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          {/* Category accent bar */}
          <div
            className={`h-0.75 w-full ${CATEGORY_ACCENT_BG[hoveredEvent.category] || "bg-cyan-500"} opacity-90`}
          />

          {/* Main content */}
          <div className="p-4 flex flex-col gap-3">
            {/* Source + category badge row */}
            <div className="flex items-center gap-2">
              <span
                className={`text-[8px] font-mono font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                  hoveredEvent.category === "conflict"
                    ? "border-red-500/20 text-cat-conflict bg-red-500/10"
                    : hoveredEvent.category === "disaster"
                      ? "border-orange-500/20 text-cat-disaster bg-orange-500/10"
                      : hoveredEvent.category === "health"
                        ? "border-purple-500/20 text-cat-health bg-purple-500/10"
                        : hoveredEvent.category === "space"
                          ? "border-cyan-500/20 text-cat-space bg-cyan-500/10"
                          : "border-slate-500/20 text-cat-news bg-slate-500/10"
                }`}
              >
                {hoveredEvent.category}
              </span>
              <span
                className={`text-[9px] font-mono uppercase tracking-wide ${
                  isLight
                    ? "text-slate-600 font-bold"
                    : "text-brand-text-secondary"
                }`}
              >
                {hoveredEvent.source}
              </span>
              {hoveredEvent.locationName &&
                hoveredEvent.locationName !== "SYSTEM STATUS" &&
                hoveredEvent.locationName !== "Global" && (
                  <>
                    <span
                      className={isLight ? "text-slate-400" : "text-slate-700"}
                    >
                      ·
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase tracking-wide ${
                        isLight
                          ? "text-slate-500 font-bold"
                          : "text-brand-text-muted"
                      }`}
                    >
                      {hoveredEvent.locationName}
                    </span>
                  </>
                )}
            </div>

            {/* Headline */}
            <h4
              className={`font-sans font-bold text-sm leading-snug tracking-tight ${
                isLight ? "text-slate-900" : "text-brand-text-primary"
              }`}
            >
              {hoveredEvent.title}
            </h4>

            {/* Description — scrollable if very long */}
            <div className="max-h-40 overflow-y-auto pr-1">
              <p
                className={`font-sans text-[11px] leading-relaxed ${
                  isLight
                    ? "text-slate-700 font-medium"
                    : "text-brand-text-secondary"
                }`}
              >
                {hoveredEvent.description}
              </p>
            </div>

            {/* Footer */}
            <div
              className={`flex items-center justify-between pt-2.5 border-t ${
                isLight ? "border-slate-200" : "border-brand-border"
              }`}
            >
              <span
                className={`text-[9px] font-mono tracking-wide ${
                  isLight
                    ? "text-slate-500 font-medium"
                    : "text-brand-text-muted"
                }`}
              >
                {formatTime(hoveredEvent.publishedAt)}
              </span>
              {hoveredEvent.url && hoveredEvent.url !== "#" ? (
                <a
                  href={hoveredEvent.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded transition-all duration-150 uppercase tracking-wide border ${
                    isLight
                      ? "text-cyan-900 bg-cyan-50 border-cyan-300 hover:bg-cyan-100 hover:border-cyan-400 shadow-sm"
                      : "text-cyan-400 hover:text-white hover:bg-cyan-500 border-cyan-500/30 hover:border-cyan-400"
                  }`}
                >
                  Open full article
                  <span className="text-[11px]">→</span>
                </a>
              ) : (
                <span className="text-[9px] font-mono text-slate-500 italic">
                  No link available
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
