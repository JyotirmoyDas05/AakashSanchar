"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  type StrategicAnalysisPillars,
  synthesizeRegionIntelligence,
} from "@/lib/intelligenceSynthesizer";
import type { LocationDigest } from "@/lib/locationDigest";
import { usableTimes } from "@/lib/regionAnalysis";
import { calculateCoreSpatialCluster, searchEvents } from "@/lib/search";
import { synthesizeStrategicAnalysisWithLLM } from "@/lib/webLLM";
import type { NewsEvent } from "@/types/news";
import ResizeHandles from "./ResizeHandles";
import { SolvingOrb } from "./SolvingOrb";

const RealMiniMap = dynamic(() => import("@/components/RealMiniMap"), {
  ssr: false,
});

interface RegionWindowProps {
  events: NewsEvent[];
  locationName: string;
  /**
   * Precomputed server-side brief + analysis for this place. Present when the
   * whole region resolves to one location; null otherwise, in which case the
   * on-device synthesis below is used instead.
   */
  digest?: LocationDigest | null;
  query?: string;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
  defaultPosition?: { x: number; y: number };
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

type IncidentLevel = "HIGH" | "ELEVATED" | "MEDIUM" | "LOW";

function getLevelForEvents(events: NewsEvent[]): IncidentLevel {
  const avg =
    events.reduce((s, e) => s + e.intensity, 0) / (events.length || 1);
  if (avg >= 0.7) return "HIGH";
  if (avg >= 0.5) return "ELEVATED";
  if (avg >= 0.3) return "MEDIUM";
  return "LOW";
}

const LEVEL_DOT: Record<IncidentLevel, string> = {
  HIGH: "#ef4444",
  ELEVATED: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#9ca3af",
};

function getCoherentEvents(events: NewsEvent[], query?: string): NewsEvent[] {
  if (!events.length) return [];
  if (query) {
    const res = searchEvents(events, query);
    if (res.results.length) return res.results;
  }
  const tagCounts = new Map<string, number>();
  for (const e of events) {
    const t = e.tag || e.category;
    tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  }
  let dominant = "";
  let maxCount = 0;
  for (const [t, count] of tagCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = t;
    }
  }
  if (dominant && dominant !== "General" && maxCount >= 2) {
    const matched = events.filter(
      (e) =>
        (e.tag || e.category) === dominant ||
        e.category === "disaster" ||
        e.category === "conflict",
    );
    if (matched.length >= 3) return matched;
  }
  return events;
}

function MiniMapCanvas({
  lat,
  lng,
  dotColor,
  isLight,
  events,
}: {
  lat: number;
  lng: number;
  dotColor: string;
  isLight: boolean;
  events?: NewsEvent[];
}) {
  return (
    <RealMiniMap
      lat={lat}
      lng={lng}
      dotColor={dotColor}
      isLight={isLight}
      events={events}
    />
  );
}

function ImageCarousel({
  images,
  dotColor,
  isLight,
  lat,
  lng,
  events,
}: {
  images: string[];
  dotColor: string;
  isLight: boolean;
  lat: number;
  lng: number;
  events?: NewsEvent[];
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const imagesCount = images.length;

  useEffect(() => {
    if (!imagesCount || paused) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % imagesCount);
    }, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [imagesCount, paused]);

  useEffect(() => {
    setIdx(0);
  }, []);

  if (!images.length) {
    return (
      <MiniMapCanvas
        lat={lat}
        lng={lng}
        dotColor={dotColor}
        isLight={isLight}
        events={events}
      />
    );
  }

  return (
    <div
      className="relative w-full h-40 overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* biome-ignore lint/performance/noImgElement: dynamic external news images with variable origins */}
      <img
        src={images[idx]}
        alt="Event"
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent pointer-events-none" />
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((imgUrl, i) => (
          <span
            key={`carousel-dot-${imgUrl || "img"}-${i}`}
            className={`h-1.5 w-1.5 rounded-full transition-all ${i === idx ? "bg-cyan-400 w-4" : "bg-white/40"}`}
          />
        ))}
      </div>
      <div className="absolute top-1.5 right-1.5 text-[8px] font-mono bg-black/50 text-white px-1.5 py-0.5 rounded">
        {idx + 1}/{images.length}
      </div>
      {images[idx] === "" && (
        <MiniMapCanvas
          lat={lat}
          lng={lng}
          dotColor={dotColor}
          isLight={isLight}
        />
      )}
    </div>
  );
}

export default function RegionWindow({
  events,
  locationName,
  digest = null,
  query,
  onClose,
  zIndex = 1050,
  onFocus,
  defaultPosition = { x: 100, y: 80 },
  theme = "dark",
  layoutMode = "sidebar",
}: RegionWindowProps) {
  const isLight = theme === "light";
  const isMobile = useIsMobile();
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(() => ({
    width: 350,
    height:
      typeof window === "undefined"
        ? 560
        : Math.min(560, Math.max(260, window.innerHeight - 160)),
  }));
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const [aiPillars, setAiPillars] = useState<StrategicAnalysisPillars | null>(
    null,
  );
  const [isAiLoading, setIsAiLoading] = useState(false);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const coherentEvents = useMemo(() => {
    return getCoherentEvents(events, query);
  }, [events, query]);

  const displayEvents = coherentEvents.length ? coherentEvents : events;
  const isFiltered = query && displayEvents.length !== events.length;

  const synthesized = useMemo(
    () => synthesizeRegionIntelligence(displayEvents, locationName, query),
    [displayEvents, locationName, query],
  );

  const level = useMemo(
    () => getLevelForEvents(displayEvents),
    [displayEvents],
  );
  const dotColor = LEVEL_DOT[level];

  // Precomputed server-side text wins: it was written once during the feed
  // refresh from the full set of dispatches for this place, so it is both
  // cheaper and better-grounded than re-deriving it on every panel open.
  const summary = digest?.summary ?? synthesized.summary;
  const analysisPillars = synthesized.analysis;
  const keyEvents = synthesized.keyEvents;

  // Background deep strategic synthesis with WebLLM (Qwen2.5-1.5B)
  useEffect(() => {
    let isMounted = true;
    setAiPillars(null);
    setIsAiLoading(true);

    synthesizeStrategicAnalysisWithLLM(displayEvents, locationName, query)
      .then((result) => {
        if (isMounted) {
          if (result) setAiPillars(result);
          setIsAiLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsAiLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [displayEvents, locationName, query]);

  const effectivePillars = useMemo(() => {
    return {
      impactAssessment:
        aiPillars?.impactAssessment || analysisPillars.impactAssessment,
      operationalDynamics:
        aiPillars?.operationalDynamics || analysisPillars.operationalDynamics,
      escalationOutlook:
        aiPillars?.escalationOutlook || analysisPillars.escalationOutlook,
      threatBreakdown: analysisPillars.threatBreakdown,
      flashpoints: aiPillars?.flashpoints?.length
        ? aiPillars.flashpoints
        : analysisPillars.flashpoints,
    };
  }, [aiPillars, analysisPillars]);

  const spatialCluster = useMemo(() => {
    return calculateCoreSpatialCluster(displayEvents);
  }, [displayEvents]);

  const primaryLat = spatialCluster.centroid ? spatialCluster.centroid[0] : 0;
  const primaryLng = spatialCluster.centroid ? spatialCluster.centroid[1] : 0;

  const subLocationName = useMemo(() => {
    if (!displayEvents.length) return null;
    const core = spatialCluster.coreEvents.length
      ? spatialCluster.coreEvents
      : displayEvents;
    const locCounts = new Map<string, number>();
    for (const e of core) {
      const raw = e.locationName;
      if (!raw || raw === "SYSTEM STATUS") continue;
      const parts = raw.split(/[,;/]/).map((p) => p.trim());
      const sub = parts.length > 1 ? parts[0] : parts[parts.length - 1];
      if (sub && sub.toUpperCase() !== locationName.toUpperCase()) {
        locCounts.set(sub, (locCounts.get(sub) || 0) + 1);
      }
    }
    let best = "";
    let maxN = 0;
    for (const [s, n] of locCounts) {
      if (n > maxN) {
        maxN = n;
        best = s;
      }
    }
    return best || null;
  }, [displayEvents, spatialCluster, locationName]);

  const images = useMemo(() => {
    const urls = displayEvents
      .map((e) => e.imageUrl)
      .filter(Boolean) as string[];
    if (!urls.length && query) {
      const fallback = events
        .map((e) => e.imageUrl)
        .filter(Boolean) as string[];
      return fallback.slice(0, 6);
    }
    return urls.slice(0, 6);
  }, [displayEvents, events, query]);

  const activityPct = useMemo(() => {
    if (!displayEvents.length) return 10;
    const avg =
      displayEvents.reduce((s, e) => s + e.intensity, 0) / displayEvents.length;
    return Math.round(avg * 90 + 10);
  }, [displayEvents]);

  // usableTimes drops feed timestamps that are epoch-zero or far-future; one of
  // those was rendering "Updated 2964d ago" on a panel whose newest dispatch
  // was two hours old.
  const eventTimes = useMemo(() => usableTimes(displayEvents), [displayEvents]);

  const firstSeen = useMemo(() => {
    const oldest = eventTimes[0];
    if (!oldest) return "unknown";
    const h = Math.floor((Date.now() - oldest) / 3_600_000);
    if (h < 1) return "< 1h ago";
    if (h === 1) return "1h ago";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }, [eventTimes]);

  const expiresIn = useMemo(() => {
    const newest = eventTimes[eventTimes.length - 1];
    if (!newest) return "48h";
    const remainMs = 48 * 3_600_000 - (Date.now() - newest);
    if (remainMs <= 0) return "< 1h";
    return `${Math.ceil(remainMs / 3_600_000)}h`;
  }, [eventTimes]);

  const handleMouseMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: Math.max(
          10,
          Math.min(window.innerWidth - size.width, startPos.current.x + dx),
        ),
        y: Math.max(
          10,
          Math.min(window.innerHeight - 100, startPos.current.y + dy),
        ),
      });
    },
    [size.width],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    setIsInteracting(false);
  }, []);

  const handleMouseDown = (e: React.PointerEvent) => {
    if (isMaximized || isMinimized || isMobile || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    isDragging.current = true;
    setIsInteracting(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: position.x, y: position.y };
    document.addEventListener("pointermove", handleMouseMove);
    document.addEventListener("pointerup", handleMouseUp);
    document.addEventListener("pointercancel", handleMouseUp);
  };

  useEffect(
    () => () => {
      document.removeEventListener("pointermove", handleMouseMove);
      document.removeEventListener("pointerup", handleMouseUp);
      document.removeEventListener("pointercancel", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  // Phone: bottom sheet instead of a 350px panel pinned at an arbitrary x/y.
  const wrapStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        top: "auto",
        width: "100%",
        maxHeight: "85dvh",
        height: isMinimized ? undefined : "85dvh",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: Math.max(zIndex + 10, 1200),
      }
    : isMaximized
      ? {
          position: "fixed",
          left: layoutMode === "sidebar" ? "calc(3.5rem + 2rem)" : "2rem",
          top: "3.5rem",
          width:
            layoutMode === "sidebar"
              ? "calc(100% - 7.5rem)"
              : "calc(100% - 4rem)",
          height: "calc(100% - 6rem)",
          zIndex: zIndex + 10,
        }
      : {
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: isMinimized ? undefined : `${size.height}px`,
          zIndex,
        };

  return (
    <div
      onMouseDownCapture={onFocus}
      style={wrapStyle}
      className={`border font-mono select-none flex flex-col overflow-hidden ${
        isMobile ? "rounded-t-2xl" : "rounded-lg"
      } ${
        isLight
          ? "border-slate-300 bg-white text-slate-900 shadow-xl"
          : "border-[#222] bg-brand-bg/95 text-slate-200 shadow-2xl backdrop-blur-md"
      } ${
        isInteracting ? "transition-none" : "transition-[left,top] duration-100"
      }`}
    >
      {isMobile && (
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <span
            className={`h-1 w-9 rounded-full ${isLight ? "bg-slate-300" : "bg-[#333]"}`}
          />
        </div>
      )}

      {/* Title bar */}
      <div
        onPointerDown={handleMouseDown}
        className={`flex items-center justify-between border-b px-3 py-2 shrink-0 cursor-grab active:cursor-grabbing rounded-t-lg ${
          isLight
            ? "bg-slate-100 border-slate-200 text-slate-900"
            : "bg-[#0d0d0e] border-[#222] text-slate-400"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <SolvingOrb size={10} />
          <span
            className={`text-[10px] font-bold tracking-widest uppercase truncate ${
              isLight ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {locationName}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setIsMinimized((p) => !p)}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
              isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                : "text-slate-500 hover:text-white hover:bg-white/10"
            }`}
            title={isMinimized ? "Restore" : "Minimize"}
          >
            <svg width="8" height="1" viewBox="0 0 8 1" aria-hidden="true">
              <line
                x1="0"
                y1="0.5"
                x2="8"
                y2="0.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMaximized((p) => !p);
              setIsMinimized(false);
            }}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
              isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                : "text-slate-500 hover:text-white hover:bg-white/10"
            }`}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <svg
                width="9"
                height="9"
                viewBox="0 0 9 9"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="2.5"
                  y="0"
                  width="6.5"
                  height="6.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M0 2.5v6.5h6.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  fill="none"
                />
              </svg>
            ) : (
              <svg
                width="9"
                height="9"
                viewBox="0 0 9 9"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="0.5"
                  y="0.5"
                  width="8"
                  height="8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
              isLight
                ? "text-slate-600 hover:text-red-600 hover:bg-red-50"
                : "text-slate-500 hover:text-red-400 hover:bg-red-500/10"
            }`}
            title="Close"
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              stroke="currentColor"
              strokeWidth="1.2"
              aria-hidden="true"
            >
              <line x1="1" y1="1" x2="7" y2="7" />
              <line x1="7" y1="1" x2="1" y2="7" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 min-h-0 overflow-y-auto select-text">
          {/* Real MiniMap or Carousel banner */}
          <div className="relative">
            <ImageCarousel
              images={images}
              dotColor={dotColor}
              isLight={isLight}
              lat={primaryLat}
              lng={primaryLng}
              events={displayEvents}
            />
            {/* Filtered Active Query pill */}
            {isFiltered && (
              <div className="absolute top-2.5 right-2.5 z-10">
                <span className="text-[8px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded border bg-cyan-500/20 text-cyan-300 border-cyan-500/40 backdrop-blur-md">
                  QUERY: {query} ({displayEvents.length})
                </span>
              </div>
            )}
          </div>

          {/* Region Header info */}
          <div
            className={`p-4 border-b ${
              isLight ? "border-slate-200" : "border-brand-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2
                className={`text-sm font-bold tracking-tight truncate ${
                  isLight ? "text-slate-900" : "text-slate-100"
                }`}
              >
                {locationName}
              </h2>
              {subLocationName && (
                <span
                  className={`text-[10px] ${
                    isLight ? "text-slate-500 font-medium" : "text-slate-500"
                  }`}
                >
                  {subLocationName}
                </span>
              )}
            </div>
            <p
              className={`text-[9px] mt-0.5 font-mono ${
                isLight ? "text-slate-500 font-medium" : "text-slate-500"
              }`}
            >
              LAT {primaryLat.toFixed(2)}° • LON {primaryLng.toFixed(2)}° •{" "}
              {displayEvents.length} DISPATCHES
            </p>
          </div>

          {/* Situation Brief */}
          <div
            className={`p-4 border-b ${
              isLight ? "border-slate-200" : "border-brand-border"
            }`}
          >
            <p className="text-[9px] font-bold tracking-widest uppercase text-slate-500 mb-1.5">
              Situation Brief
            </p>
            <p
              className={`text-[11px] leading-relaxed ${
                isLight
                  ? "text-slate-700 font-medium"
                  : "text-brand-text-secondary"
              }`}
            >
              {summary}
            </p>
          </div>

          {/* Key Events Timeline */}
          <div
            className={`p-4 border-b ${
              isLight ? "border-slate-200" : "border-brand-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-bold tracking-widest uppercase text-slate-500">
                Key Timeline Events
              </p>
              <span className="text-[9px] text-slate-500">
                LATEST {keyEvents.length}
              </span>
            </div>

            <div className="space-y-3">
              {keyEvents.map((ke) => (
                <div key={ke.id} className="flex gap-2.5 items-start">
                  <span
                    className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: ke.badgeColor || dotColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className="text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded uppercase"
                        style={{
                          backgroundColor: `${ke.badgeColor}18`,
                          color: ke.badgeColor,
                          border: `1px solid ${ke.badgeColor}33`,
                        }}
                      >
                        {ke.badge}
                      </span>
                      <span
                        className={`text-[9px] font-mono shrink-0 ${
                          isLight
                            ? "text-slate-500 font-semibold"
                            : "text-slate-500"
                        }`}
                      >
                        {ke.dateLabel} • {ke.relativeTime}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] font-bold leading-snug mb-0.5 ${
                        isLight ? "text-slate-900" : "text-slate-100"
                      }`}
                    >
                      {ke.title}
                    </p>
                    <p
                      className={`text-[10.5px] leading-relaxed ${
                        isLight
                          ? "text-slate-600 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {ke.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Analysis Section */}
          <div
            className={`px-4 pt-3 pb-3 border-t ${
              isLight ? "border-slate-200" : "border-brand-border"
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[9px] font-bold tracking-widest uppercase text-slate-500">
                Strategic Analysis
              </p>
              {aiPillars ? (
                <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AI ENRICHED (QWEN 1.5B)
                </span>
              ) : isAiLoading ? (
                <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                  <SolvingOrb size={10} />
                  ANALYZING...
                </span>
              ) : (
                <span
                  className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                    isLight
                      ? "bg-slate-100 text-slate-700 border-slate-300 font-bold"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  TACTICAL ASSESSMENT
                </span>
              )}
            </div>

            {/* Threat Breakdown Vectors */}
            {effectivePillars.threatBreakdown &&
              effectivePillars.threatBreakdown.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span className="font-bold">PRIMARY THREAT VECTORS</span>
                    <span>{displayEvents.length} DISPATCHES</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {effectivePillars.threatBreakdown.map((tv) => (
                      <span
                        key={tv.label}
                        className={`text-[8.5px] font-mono font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${
                          tv.category === "conflict"
                            ? "bg-red-500/10 text-red-400 border-red-500/25"
                            : tv.category === "disaster"
                              ? "bg-orange-500/10 text-orange-400 border-orange-500/25"
                              : tv.category === "health"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/25"
                                : tv.category === "space"
                                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25"
                                  : "bg-slate-500/10 text-slate-300 border-slate-500/25"
                        }`}
                      >
                        <span>{tv.label}</span>
                        <span className="opacity-60">({tv.pct}%)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Tactical Flashpoints */}
            {effectivePillars.flashpoints &&
              effectivePillars.flashpoints.length > 0 && (
                <div className="mb-2.5 flex items-center gap-1.5 text-[9px] font-mono flex-wrap">
                  <span className="text-slate-500 uppercase font-bold">
                    Flashpoints:
                  </span>
                  {effectivePillars.flashpoints.map((fp) => (
                    <span
                      key={fp}
                      className={`px-1.5 py-0.5 rounded text-[8px] border font-bold uppercase ${
                        isLight
                          ? "bg-slate-100 border-slate-300 text-slate-700"
                          : "bg-white/5 border-white/10 text-slate-300"
                      }`}
                    >
                      {fp}
                    </span>
                  ))}
                </div>
              )}

            {/* Assessment pillars — a pillar the dispatches cannot support
                comes back null and is dropped rather than padded with filler. */}
            <div className="space-y-2 mb-3 text-[10.5px] leading-relaxed">
              {digest ? (
                /* Precomputed: one narrative block, as world-monitor renders it. */
                <div
                  className={`p-2.5 rounded border ${
                    isLight
                      ? "bg-slate-50 border-slate-200 text-slate-800"
                      : "bg-[#0b101c]/80 border-brand-border/60 text-slate-300"
                  }`}
                >
                  <span className="font-bold text-[9px] uppercase tracking-wider block mb-0.5 text-orange-500">
                    • Analysis
                  </span>
                  {digest.analysis}
                </div>
              ) : null}
              {(digest
                ? ([] as Array<[string, string, string | null]>)
                : ([
                    [
                      "Impact & Infrastructure",
                      "text-orange-500",
                      effectivePillars.impactAssessment,
                    ],
                    [
                      "Named In Coverage",
                      "text-emerald-500",
                      effectivePillars.operationalDynamics,
                    ],
                    [
                      "Reporting Cadence",
                      "text-cyan-500",
                      effectivePillars.escalationOutlook,
                    ],
                  ] as Array<[string, string, string | null]>)
              )
                .filter(([, , body]) => Boolean(body))
                .map(([label, colour, body]) => (
                  <div
                    key={label}
                    className={`p-2.5 rounded border ${
                      isLight
                        ? "bg-slate-50 border-slate-200 text-slate-800"
                        : "bg-[#0b101c]/80 border-brand-border/60 text-slate-300"
                    }`}
                  >
                    <span
                      className={`font-bold text-[9px] uppercase tracking-wider block mb-0.5 ${colour}`}
                    >
                      • {label}
                    </span>
                    {body}
                  </div>
                ))}
            </div>

            {/* Activity Level Gauge */}
            <div
              className={`rounded p-2.5 border ${
                isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-black/30 border-brand-border"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p
                  className={`text-[9px] font-bold tracking-widest uppercase ${
                    isLight ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  Activity Level ({activityPct}%)
                </p>
                <span className="text-[9px] text-slate-500 font-medium">
                  Updated {firstSeen}
                </span>
              </div>
              <div
                className={`h-1.5 rounded-full overflow-hidden mb-2 ${
                  isLight ? "bg-slate-200" : "bg-brand-border"
                }`}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${activityPct}%`,
                    backgroundColor: dotColor,
                    boxShadow: `0 0 6px ${dotColor}55`,
                  }}
                />
              </div>
              <p
                className={`text-[9px] leading-relaxed mb-2 ${
                  isLight ? "text-slate-600 font-medium" : "text-slate-500"
                }`}
              >
                Activity level reflects signal reporting density across the
                region. The index resets on new developments and gradually
                decays over 48 hours.
              </p>
              <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                <span>First seen: {firstSeen}</span>
                <span>Expires in {expiresIn}</span>
              </div>
            </div>
          </div>

          {/* AI Disclaimer */}
          <div
            className={`px-4 py-3 border-t ${
              isLight ? "border-slate-200" : "border-brand-border"
            }`}
          >
            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              {digest
                ? `Brief and analysis precomputed server-side at ${new Date(digest.processedAt).toISOString().slice(11, 16)} UTC from ${digest.mentionCount} dispatches across ${digest.sourceCount} outlets. Extracted from the reporting; no model wrote this.`
                : aiPillars
                  ? "Disclaimer: This strategic analysis was written by an on-device model (WebLLM Qwen2.5-1.5B, cached) and may contain inaccuracies."
                  : "Figures, names and cadence above are extracted directly from the dispatches listed — no model wrote this. Provided for situational awareness only."}
            </p>
          </div>
        </div>
      )}

      {!isMaximized && !isMinimized && !isMobile && (
        <ResizeHandles
          size={size}
          position={position}
          setSize={setSize}
          setPosition={setPosition}
          onInteractingChange={setIsInteracting}
          minWidth={300}
          minHeight={260}
        />
      )}
    </div>
  );
}
