"use client";

import { labelForCategory } from "@/lib/filterEvents";
import { formatTime } from "@/lib/formatTime";
import type { NewsCategory, NewsEvent } from "@/types/news";

const CATEGORY_COLORS: Record<
  NewsCategory,
  { text: string; bg: string; border: string; glow: string }
> = {
  breaking: {
    text: "text-rose-400",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
    glow: "glow-breaking",
  },
  protests: {
    text: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    glow: "glow-protests",
  },
  disasters: {
    text: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    glow: "glow-disasters",
  },
  politics: {
    text: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    glow: "glow-politics",
  },
  economy: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    glow: "glow-economy",
  },
  tech: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
    glow: "glow-tech",
  },
};

interface EventDetailsPanelProps {
  event: NewsEvent | null;
  onClose: () => void;
  onFocusOnMap?: (coords: [number, number]) => void;
}

export default function EventDetailsPanel({
  event,
  onClose,
  onFocusOnMap,
}: EventDetailsPanelProps) {
  if (!event) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center border-l border-brand-border bg-[#0d1423]/70 backdrop-blur-md">
        <svg
          className="h-10 w-10 text-slate-600 mb-3"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 6.75h12m-12 5.25h12m-12 5.25h12M3 6.75h.008v.008H3V6.75zm0 5.25h.008v.008H3v-.008zm0 5.25h.008v.008H3v-.008z"
          />
        </svg>
        <span className="font-mono text-xs text-slate-500 tracking-wider">
          NO SEGMENT SELECTED
        </span>
        <p className="mt-1 text-xs text-slate-600 max-w-[180px]">
          Select an incident node on the map grid or search list to inspect
          details.
        </p>
      </div>
    );
  }

  const styles = CATEGORY_COLORS[event.category];

  return (
    <div className="flex h-full flex-col border-l border-brand-border bg-[#0d1423]/90 backdrop-blur-md text-slate-200">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${styles.glow} bg-current`} />
          <h2 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">
            NODE ANALYSIS
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-brand-border hover:text-white transition-colors"
          aria-label="Close details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Panel Scroll Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Category Pill + Published Time */}
        <div className="flex items-center justify-between">
          <span
            className={`rounded border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${styles.text} ${styles.bg} ${styles.border}`}
          >
            {labelForCategory(event.category)}
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {formatTime(event.publishedAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold leading-snug text-white tracking-tight">
          {event.title}
        </h3>

        {/* Description / Summary */}
        <div className="rounded-lg border border-brand-border bg-[#070b13] p-3">
          <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
            Summary Brief
          </span>
          <p className="text-xs leading-relaxed text-slate-300">
            {event.description}
          </p>
        </div>

        {/* Coords & Metadata Section */}
        <div className="space-y-3 pt-2">
          {/* Geographic Coordinates */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-brand-border/40 p-2.5 bg-black/10">
            <div>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block">
                LATITUDE
              </span>
              <span className="font-mono text-xs text-slate-300 font-bold">
                {event.lat.toFixed(5)}° N
              </span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block">
                LONGITUDE
              </span>
              <span className="font-mono text-xs text-slate-300 font-bold">
                {event.lng.toFixed(5)}° E
              </span>
            </div>
          </div>

          {/* Location Name & Source */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block">
                SECTOR LOCATION
              </span>
              <p className="font-medium text-slate-300 truncate mt-0.5">
                {event.locationName}
              </p>
            </div>
            <div>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block">
                REPORT SOURCE
              </span>
              <p className="font-medium text-slate-300 truncate mt-0.5">
                {event.source}
              </p>
            </div>
          </div>

          {/* Signal Intensity */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
                SIGNAL INTENSITY
              </span>
              <span className="font-mono text-[10px] text-slate-300 font-bold">
                {(event.intensity * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 rounded bg-brand-border overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 ${
                  event.category === "breaking"
                    ? "bg-rose-500"
                    : event.category === "protests"
                      ? "bg-orange-500"
                      : event.category === "disasters"
                        ? "bg-red-500"
                        : event.category === "politics"
                          ? "bg-blue-500"
                          : event.category === "economy"
                            ? "bg-emerald-500"
                            : "bg-cyan-500"
                }`}
                style={{ width: `${event.intensity * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      {onFocusOnMap && (
        <div className="p-3 border-t border-brand-border bg-black/20">
          <button
            type="button"
            onClick={() => onFocusOnMap([event.lat, event.lng])}
            className="w-full flex items-center justify-center gap-2 rounded border border-[#2b3e63] bg-brand-border/40 py-2 font-mono text-[11px] font-bold text-slate-300 hover:text-white hover:bg-brand-border/80 transition-all active:scale-98"
          >
            <svg
              className="h-3.5 w-3.5 text-cyan-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
            LOCK SENSOR FOCUS
          </button>
        </div>
      )}
    </div>
  );
}
