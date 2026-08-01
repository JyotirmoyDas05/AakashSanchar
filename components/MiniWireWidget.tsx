"use client";

import { labelForCategory } from "@/lib/filterEvents";
import { formatTime } from "@/lib/formatTime";
import type { NewsEvent } from "@/types/news";
import FloatingWindow from "./FloatingWindow";

interface MiniWireWidgetProps {
  events: NewsEvent[];
  onEventSelect: (eventId: string, coords: [number, number]) => void;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

export default function MiniWireWidget({
  events,
  onEventSelect,
  onClose,
  defaultPosition = { x: 80, y: 80 },
  zIndex,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
}: MiniWireWidgetProps) {
  const isLight = theme === "light";

  return (
    <FloatingWindow
      title="INCIDENT WIRE REPORT"
      theme={theme}
      layoutMode={layoutMode}
      icon={
        <svg
          className="h-4.5 w-4.5 text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
      }
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={{ width: 380, height: 450 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      {/* List items feed */}
      <div
        className={`w-full h-full overflow-y-auto p-2 space-y-1.5 font-mono ${
          isLight ? "bg-white text-slate-900" : "bg-black/40 text-slate-200"
        }`}
      >
        {events.length === 0 ? (
          <div
            className={`py-8 text-center text-xs italic ${
              isLight ? "text-slate-500" : "text-slate-600"
            }`}
          >
            NO FEED SIGNALS LOGGED
          </div>
        ) : (
          events.map((ev) => {
            let dotColor = "bg-slate-500";
            if (ev.category === "conflict")
              dotColor = "bg-cat-conflict glow-conflict";
            else if (ev.category === "disaster")
              dotColor = "bg-cat-disaster glow-disaster";
            else if (ev.category === "health")
              dotColor = "bg-cat-health glow-health";
            else if (ev.category === "space")
              dotColor = "bg-cat-space glow-space";

            return (
              <div
                key={ev.id}
                onClick={() => onEventSelect(ev.id, [ev.lat, ev.lng])}
                className={`group cursor-pointer rounded border p-2 text-left transition-colors ${
                  isLight
                    ? "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 shadow-sm"
                    : "border-[#222]/30 bg-[#07070a] hover:bg-[#0d0d0e] text-slate-200"
                }`}
              >
                <div
                  className={`flex items-center justify-between text-[9px] font-bold ${
                    isLight ? "text-slate-600" : "text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                    <span className="font-bold uppercase tracking-wider">
                      {labelForCategory(ev.category)}
                    </span>
                  </div>
                  <span>{formatTime(ev.publishedAt)}</span>
                </div>
                <h4
                  className={`mt-1 text-xs font-bold transition-colors line-clamp-1 ${
                    isLight
                      ? "text-slate-900 group-hover:text-cyan-800"
                      : "text-slate-200 group-hover:text-cyan-400"
                  }`}
                >
                  {ev.title}
                </h4>
                <div
                  className={`mt-1 flex items-center justify-between text-[8px] font-semibold ${
                    isLight ? "text-slate-500" : "text-slate-600"
                  }`}
                >
                  <span>{ev.locationName.toUpperCase()}</span>
                  <span>{ev.source.toUpperCase()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </FloatingWindow>
  );
}
