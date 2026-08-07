"use client";

import { deriveOutbreaks, type OutbreakSignal } from "@/lib/deriveOutbreaks";
import type { NewsEvent } from "@/types/news";
import FloatingWindow from "./FloatingWindow";

interface OutbreaksWidgetProps {
  events: NewsEvent[];
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

function formatLastSeen(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function OutbreaksWidget({
  events,
  onClose,
  defaultPosition = { x: 220, y: 220 },
  zIndex,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
}: OutbreaksWidgetProps) {
  const isLight = theme === "light";
  const signals: OutbreakSignal[] = deriveOutbreaks(events);

  return (
    <FloatingWindow
      title="EPIDEMIOLOGICAL MONITOR"
      theme={theme}
      layoutMode={layoutMode}
      icon={
        <svg
          className="h-4.5 w-4.5 text-rose-500 animate-pulse"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      }
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={{ width: 384, height: 320 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div
        className={`w-full h-full font-mono flex flex-col justify-between min-h-0 ${
          isLight ? "bg-white text-slate-900" : "bg-black/40 text-slate-200"
        }`}
      >
        {/* Outbreaks table view */}
        <div className="p-2.5 flex-1 min-h-0 overflow-y-auto">
          {signals.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-4">
              <p
                className={`text-[10px] font-bold tracking-widest leading-relaxed ${
                  isLight ? "text-emerald-700" : "text-emerald-500"
                }`}
              >
                NO ACTIVE OUTBREAK SIGNALS IN CURRENT FEED
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-[10px] font-mono leading-normal border-collapse">
              <thead>
                <tr
                  className={`border-b font-bold uppercase tracking-wider ${
                    isLight
                      ? "border-slate-200 text-slate-700"
                      : "border-[#222] text-slate-500"
                  }`}
                >
                  <th className="pb-2">PATHOGEN</th>
                  <th className="pb-2">LOCATION</th>
                  <th className="pb-2 text-right">RPTS</th>
                  <th className="pb-2 text-right">LAST</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isLight ? "divide-slate-200" : "divide-[#222]/40"
                }`}
              >
                {signals.map((o) => (
                  <tr
                    key={o.id}
                    className={`transition-colors ${
                      isLight ? "hover:bg-slate-50" : "hover:bg-brand-border/20"
                    }`}
                  >
                    <td
                      className={`py-2.5 font-bold ${
                        isLight ? "text-slate-900" : "text-slate-200"
                      }`}
                    >
                      {o.pathogen}
                    </td>
                    <td
                      className={`py-2.5 truncate max-w-22.5 ${
                        isLight
                          ? "text-slate-600 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {o.location}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums font-bold ${
                        isLight ? "text-rose-700" : "text-rose-400"
                      }`}
                    >
                      {o.reports}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums ${
                        isLight ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      {formatLastSeen(o.lastSeen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer warning */}
        <div
          className={`border-t px-3 py-2 text-[9px] font-bold leading-normal text-center shrink-0 ${
            isLight
              ? "bg-red-50 text-red-700 border-slate-200"
              : "bg-[#220d0d]/35 text-red-400 border-[#222]"
          }`}
        >
          {signals.length > 0
            ? `LIVE · ${signals.length} PATHOGEN SIGNAL(S) FROM NEWS MONITORING`
            : "LIVE · DERIVED FROM GDELT HEALTH EVENTS"}
        </div>
      </div>
    </FloatingWindow>
  );
}
