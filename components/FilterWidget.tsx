"use client";

import { labelForCategory } from "@/lib/filterEvents";
import type { NewsCategory } from "@/types/news";

interface FilterWidgetProps {
  activeLayers: NewsCategory[];
  onToggleLayer: (category: NewsCategory) => void;
  onClose: () => void;
  theme?: "dark" | "light";
}

const CATEGORIES: {
  id: NewsCategory;
  label: string;
  sub: string;
  color: string;
}[] = [
  {
    id: "news",
    label: "News / Geopolitical",
    sub: "Product Launch • Cinema • Sports • Market • Diplomacy • Election • Energy • Rescue",
    color: "bg-cat-news shadow-sm",
  },
  {
    id: "conflict",
    label: "Conflict / OSINT",
    sub: "Armed Clash • Airstrike • Ceasefire Talks",
    color: "bg-cat-conflict glow-conflict",
  },
  {
    id: "disaster",
    label: "Disaster / Seismic",
    sub: "Flood • Quake • Cyclone • Wildfire",
    color: "bg-cat-disaster glow-disaster",
  },
  {
    id: "health",
    label: "Health / Epidemics",
    sub: "Outbreak",
    color: "bg-cat-health glow-health",
  },
  {
    id: "space",
    label: "Space / Solar",
    sub: "Space",
    color: "bg-cat-space glow-space",
  },
];

export default function FilterWidget({
  activeLayers,
  onToggleLayer,
  onClose,
  theme = "dark",
}: FilterWidgetProps) {
  const isLight = theme === "light";

  return (
    <div
      className={`absolute right-4 bottom-16 z-1050 w-64 rounded-lg border font-mono select-none overflow-hidden ${
        isLight
          ? "border-slate-300 bg-white text-slate-900 shadow-xl"
          : "border-[#222] bg-brand-bg/95 text-slate-200 shadow-2xl backdrop-blur-md"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between border-b px-3 py-2 ${
          isLight
            ? "bg-slate-100 border-slate-200 text-slate-900"
            : "bg-[#0d0d0e] border-[#222] text-slate-400"
        }`}
      >
        <span
          className={`text-[10px] font-bold tracking-wider uppercase ${
            isLight ? "text-slate-800" : "text-slate-400"
          }`}
        >
          LAYER SCANNER FILTERS
        </span>
        <button
          type="button"
          onClick={onClose}
          className={`rounded px-1 text-xs transition-colors ${
            isLight
              ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
        >
          ✕
        </button>
      </div>

      {/* Checklist options */}
      <div
        className={`p-3 space-y-2 ${
          isLight ? "bg-white text-slate-900" : "bg-brand-bg text-slate-200"
        }`}
      >
        {CATEGORIES.map((c) => {
          const isActive = activeLayers.includes(c.id);
          return (
            <label
              key={c.id}
              className={`flex items-center justify-between p-2 rounded border transition-colors cursor-pointer ${
                isLight
                  ? "border-slate-200 bg-slate-50 hover:bg-cyan-50"
                  : "border-[#222]/40 bg-black/40 hover:bg-[#0d0d0e]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`h-2 w-2 rounded-full ${c.color} shrink-0`} />
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs font-semibold leading-none ${
                      isLight ? "text-slate-800" : "text-slate-300"
                    }`}
                  >
                    {labelForCategory(c.id)}
                  </span>
                  <span
                    className={`text-[8px] leading-none mt-1 truncate max-w-37.5 ${
                      isLight ? "text-slate-500" : "text-slate-500"
                    }`}
                    title={c.sub}
                  >
                    {c.sub}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => onToggleLayer(c.id)}
                className="h-3.5 w-3.5 rounded border-[#333] bg-black checked:bg-cyan-500 cursor-pointer outline-none"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
