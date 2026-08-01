"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NewsEvent } from "@/types/news";

interface RegionWindowProps {
  events: NewsEvent[];
  locationName: string;
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

const LEVEL_BADGE: Record<IncidentLevel, string> = {
  HIGH: "text-red-500 bg-red-500/10 border-red-500/25 font-bold",
  ELEVATED: "text-orange-500 bg-orange-500/10 border-orange-500/25 font-bold",
  MEDIUM: "text-yellow-600 bg-yellow-500/10 border-yellow-500/25 font-bold",
  LOW: "text-slate-600 bg-slate-500/10 border-slate-500/25 font-bold",
};

function buildSummary(events: NewsEvent[]): string {
  if (!events.length) return "No events reported.";
  const location = events[0].locationName;
  const cats = [...new Set(events.map((e) => e.category))];
  const catStr = cats.includes("conflict")
    ? "military and conflict activity"
    : cats.includes("disaster")
      ? "natural disaster and emergency activity"
      : cats.includes("health")
        ? "health and outbreak activity"
        : "geopolitical and news activity";
  const topTitle = events[0].title;
  const snippet =
    topTitle.length > 80 ? `${topTitle.substring(0, 80)}…` : topTitle;
  return `Multiple reports of ${catStr} detected around ${location}. The situation involves ${events.length} separate incident${events.length !== 1 ? "s" : ""} across the region. ${snippet}`;
}

function buildKeyEvents(events: NewsEvent[]) {
  return events.slice(0, 6).map((ev) => {
    const d = new Date(ev.publishedAt);
    const month = d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    const hour = d.getHours();
    const tod =
      hour < 6
        ? "night"
        : hour < 12
          ? "morning"
          : hour < 17
            ? "afternoon"
            : hour < 21
              ? "evening"
              : "night";
    return { dateLabel: `${month}, ${tod}`, title: ev.title };
  });
}

function MiniMapCanvas({
  lat,
  lng,
  dotColor,
  isLight,
}: {
  lat: number;
  lng: number;
  dotColor: string;
  isLight: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = isLight ? "#f1f5f9" : "#070a07";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = isLight ? "#e2e8f0" : "#111811";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Terrain blobs
    ctx.fillStyle = isLight ? "#e2e8f0" : "#0d150d";
    const blobs = [
      { x: w * 0.2, y: h * 0.3, r: 28 },
      { x: w * 0.72, y: h * 0.6, r: 42 },
      { x: w * 0.5, y: h * 0.2, r: 22 },
      { x: w * 0.88, y: h * 0.4, r: 32 },
      { x: w * 0.14, y: h * 0.72, r: 38 },
    ];
    for (const b of blobs) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Coastline stroke
    ctx.strokeStyle = isLight ? "#cbd5e1" : "#1a2a1a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.bezierCurveTo(w * 0.3, h * 0.38, w * 0.62, h * 0.62, w, h * 0.44);
    ctx.stroke();

    // Glow ring
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
    grad.addColorStop(0, `${dotColor}80`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    // Center dot
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Coord label
    ctx.fillStyle = isLight ? "#475569" : "#6b7280";
    ctx.font = "bold 7px monospace";
    ctx.fillText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, cx - 28, cy + 20);
  }, [lat, lng, dotColor, isLight]);

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={110}
      className="w-full block"
      aria-label="Mini map"
    />
  );
}

export default function RegionWindow({
  events,
  locationName,
  onClose,
  zIndex = 1050,
  onFocus,
  defaultPosition = { x: 100, y: 80 },
  theme = "dark",
  layoutMode = "sidebar",
}: RegionWindowProps) {
  const isLight = theme === "light";
  const [position, setPosition] = useState(defaultPosition);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const level = useMemo(() => getLevelForEvents(events), [events]);
  const dotColor = LEVEL_DOT[level];
  const badgeClass = LEVEL_BADGE[level];
  const summary = useMemo(() => buildSummary(events), [events]);
  const keyEvents = useMemo(() => buildKeyEvents(events), [events]);

  const primaryLat = events[0]?.lat ?? 0;
  const primaryLng = events[0]?.lng ?? 0;

  const activityPct = useMemo(() => {
    if (!events.length) return 10;
    const avg = events.reduce((s, e) => s + e.intensity, 0) / events.length;
    return Math.round(avg * 90 + 10);
  }, [events]);

  const firstSeen = useMemo(() => {
    if (!events.length) return "unknown";
    const oldest = events.reduce((a, b) =>
      new Date(a.publishedAt) < new Date(b.publishedAt) ? a : b,
    );
    const h = Math.floor(
      (Date.now() - new Date(oldest.publishedAt).getTime()) / 3_600_000,
    );
    return h < 1 ? "< 1h ago" : `${h}h ago`;
  }, [events]);

  const expiresIn = `${Math.round((100 - activityPct) * 0.48)}h`;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    setPosition({
      x: startPos.current.x + e.clientX - dragStart.current.x,
      y: startPos.current.y + e.clientY - dragStart.current.y,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      setIsInteracting(false);
    }
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized || isMinimized || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    isDragging.current = true;
    setIsInteracting(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: position.x, y: position.y };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  useEffect(
    () => () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  const wrapStyle: React.CSSProperties = isMaximized
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
        width: "340px",
        zIndex,
      };

  return (
    <div
      onMouseDownCapture={onFocus}
      style={wrapStyle}
      className={`rounded-lg border font-mono select-none flex flex-col ${
        isLight
          ? "border-slate-300 bg-white text-slate-900 shadow-xl"
          : "border-[#222] bg-brand-bg/95 text-slate-200 shadow-2xl backdrop-blur-md"
      } ${
        isInteracting ? "transition-none" : "transition-[left,top] duration-100"
      }`}
    >
      {/* Title bar */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between border-b px-3 py-2 shrink-0 cursor-grab active:cursor-grabbing rounded-t-lg ${
          isLight
            ? "bg-slate-100 border-slate-200 text-slate-900"
            : "bg-[#0d0d0e] border-[#222] text-slate-400"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: dotColor }}
          />
          <span
            className={`text-[10px] font-bold tracking-widest uppercase ${
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
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                : "text-slate-500 hover:text-white hover:bg-white/10"
            }`}
            title="Close"
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 9 9"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 1l7 7M8 1L1 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <div
          className={`flex flex-col overflow-y-auto ${
            isMaximized ? "flex-1" : "max-h-145"
          }`}
        >
          {/* Level badges + location */}
          <div className="px-4 pt-3 pb-2.5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <span
                className={`text-[9px] font-bold tracking-widest uppercase border px-2 py-0.5 rounded ${badgeClass}`}
              >
                {level}
              </span>
              <span
                className={`text-[9px] font-bold tracking-widest uppercase border px-2 py-0.5 rounded ${
                  isLight
                    ? "text-slate-700 bg-slate-100 border-slate-300"
                    : "text-slate-400 bg-slate-500/10 border-slate-500/25"
                }`}
              >
                LEVEL {events.length}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <h2
                className={`text-sm font-bold ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {locationName}
              </h2>
              <span
                className={`text-[10px] ${
                  isLight ? "text-slate-500 font-medium" : "text-slate-500"
                }`}
              >
                {events[0]?.locationName ?? ""}
              </span>
            </div>
            <p
              className={`text-[9px] mt-0.5 font-mono ${
                isLight ? "text-slate-500 font-bold" : "text-slate-600"
              }`}
            >
              {primaryLat.toFixed(4)}, {primaryLng.toFixed(4)}
            </p>
          </div>

          {/* Mini map */}
          <div
            className={`border-t border-b ${
              isLight ? "border-slate-200" : "border-brand-border"
            }`}
          >
            <MiniMapCanvas
              lat={primaryLat}
              lng={primaryLng}
              dotColor={dotColor}
              isLight={isLight}
            />
          </div>

          {/* Summary */}
          <div className="px-4 py-3">
            <p
              className={`text-[9px] font-bold tracking-widest uppercase mb-1.5 ${
                isLight ? "text-slate-600" : "text-slate-600"
              }`}
            >
              Summary
            </p>
            <p
              className={`text-[11px] leading-relaxed ${
                isLight ? "text-slate-800 font-semibold" : "text-slate-300"
              }`}
            >
              {summary}
            </p>
          </div>

          {/* Key Events */}
          <div
            className={`px-4 pb-3 border-t pt-3 ${
              isLight ? "border-slate-200" : "border-brand-border"
            }`}
          >
            <p className="text-[9px] font-bold tracking-widest uppercase text-slate-600 mb-2.5">
              Key Events
            </p>
            <div className="space-y-3">
              {keyEvents.map((ke, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                <div key={i} className="flex gap-2.5">
                  <span
                    className="mt-0.5 h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <div>
                    <p
                      className={`text-[10px] font-bold mb-0.5 ${
                        isLight ? "text-cyan-700" : "text-cyan-500"
                      }`}
                    >
                      {ke.dateLabel}
                    </p>
                    <p
                      className={`text-[11px] leading-snug ${
                        isLight
                          ? "text-slate-800 font-semibold"
                          : "text-slate-300"
                      }`}
                    >
                      {ke.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analysis heading */}
          <div
            className={`px-4 pt-3 pb-1 border-t ${
              isLight ? "border-slate-200" : "border-brand-border"
            }`}
          >
            <p className="text-[9px] font-bold tracking-widest uppercase text-slate-600">
              Analysis
            </p>
          </div>

          {/* Activity Level */}
          <div className="px-4 pb-3 pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1">
                <p
                  className={`text-[9px] font-bold tracking-widest uppercase ${
                    isLight ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  Activity Level
                </p>
              </div>
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
                isLight ? "text-slate-600 font-medium" : "text-slate-600"
              }`}
            >
              Activity level reflects how actively this area is being reported
              on. Each new development resets the timer. The bar depletes over
              48h — once empty, the marker is removed from the map.
            </p>
            <div className="flex justify-between text-[9px] text-slate-500 font-medium">
              <span>First seen: {firstSeen}</span>
              <span>Expires in {expiresIn}</span>
            </div>
          </div>

          {/* AI Disclaimer */}
          <div
            className={`px-4 py-3 border-t ${
              isLight ? "border-slate-200" : "border-brand-border"
            }`}
          >
            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              Disclaimer: This is an AI-powered summary. It may contain
              inaccuracies. It does not take a political stance and is provided
              for informational purposes only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
