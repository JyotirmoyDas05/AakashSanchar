"use client";

import { labelForCategory } from "@/lib/filterEvents";
import type { NewsCategory } from "@/types/news";

interface LeftControlRailProps {
  activeLayers: NewsCategory[];
  onToggleLayer: (category: NewsCategory) => void;
  onToggleAll: (enable: boolean) => void;
  visualMode: "nodes" | "heat";
  onChangeVisualMode: (mode: "nodes" | "heat") => void;
  onOpenSearch: () => void;
  eventsCountByCategory: Record<NewsCategory, number>;
}

const CATEGORIES: {
  id: NewsCategory;
  label: string;
  color: string;
  ringColor: string;
}[] = [
  {
    id: "breaking",
    label: "Breaking",
    color: "bg-cat-breaking",
    ringColor: "glow-breaking",
  },
  {
    id: "protests",
    label: "Protests",
    color: "bg-cat-protests",
    ringColor: "glow-protests",
  },
  {
    id: "disasters",
    label: "Disasters",
    color: "bg-cat-disasters",
    ringColor: "glow-disasters",
  },
  {
    id: "politics",
    label: "Politics",
    color: "bg-cat-politics",
    ringColor: "glow-politics",
  },
  {
    id: "economy",
    label: "Economy",
    color: "bg-cat-economy",
    ringColor: "glow-economy",
  },
  {
    id: "tech",
    label: "Tech / Cyber",
    color: "bg-cat-tech",
    ringColor: "glow-tech",
  },
];

export default function LeftControlRail({
  activeLayers,
  onToggleLayer,
  onToggleAll,
  visualMode,
  onChangeVisualMode,
  onOpenSearch,
  eventsCountByCategory,
}: LeftControlRailProps) {
  const allEnabled = activeLayers.length === CATEGORIES.length;

  return (
    <div className="flex h-full w-[240px] flex-col border-r border-brand-border bg-[#070b13] p-4 text-slate-300 select-none">
      {/* Search Trigger widget */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="mb-4 flex items-center justify-between w-full rounded border border-brand-border bg-[#0d1423]/70 px-3 py-2 text-left font-mono text-[11px] hover:bg-brand-border transition-colors hover:border-brand-border-glow group"
      >
        <span className="text-slate-400 group-hover:text-white transition-colors">
          SEARCH COMMANDS
        </span>
        <span className="rounded bg-brand-border border border-slate-700 px-1 py-0.5 text-[9px] text-slate-500 font-bold group-hover:text-slate-300">
          ⌘K
        </span>
      </button>

      {/* Title */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          TELEMETER LAYERS
        </span>
        <button
          type="button"
          onClick={() => onToggleAll(!allEnabled)}
          className="font-mono text-[9px] text-cyan-500 hover:text-cyan-400 font-bold uppercase transition-colors"
        >
          {allEnabled ? "DESELECT ALL" : "SELECT ALL"}
        </button>
      </div>

      {/* Layers list */}
      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {CATEGORIES.map((cat) => {
          const isActive = activeLayers.includes(cat.id);
          const count = eventsCountByCategory[cat.id] || 0;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggleLayer(cat.id)}
              className={`flex w-full items-center justify-between rounded border p-2 text-left transition-all duration-150 ${
                isActive
                  ? "bg-[#0f192b] border-[#223555] text-white shadow-inner"
                  : "bg-transparent border-transparent hover:bg-brand-border/40 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Indicator dot */}
                <div
                  className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-300 ${
                    isActive
                      ? `${cat.color} ${cat.ringColor}`
                      : "bg-slate-700 shadow-none"
                  }`}
                />
                <span className="truncate text-xs font-semibold uppercase tracking-wider">
                  {labelForCategory(cat.id)}
                </span>
              </div>

              {/* Badge count */}
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                  isActive
                    ? "bg-[#182944]/55 border-[#2c4772]/70 text-slate-200"
                    : "bg-transparent border-transparent text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visual Modes and Settings at the bottom */}
      <div className="mt-4 border-t border-brand-border pt-4 space-y-3">
        <div>
          <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">
            VISUALIZATION STYLE
          </span>
          <div className="grid grid-cols-2 gap-1 rounded bg-[#0d1423] p-1 border border-brand-border">
            <button
              type="button"
              onClick={() => onChangeVisualMode("nodes")}
              className={`rounded py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
                visualMode === "nodes"
                  ? "bg-brand-border text-white shadow"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              NODES
            </button>
            <button
              type="button"
              onClick={() => onChangeVisualMode("heat")}
              className={`rounded py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
                visualMode === "heat"
                  ? "bg-brand-border text-white shadow"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              HEATMAP
            </button>
          </div>
        </div>

        {/* Telemetry info */}
        <div className="rounded border border-brand-border bg-[#070b13] p-2 font-mono text-[9px] text-slate-500 space-y-1">
          <div className="flex justify-between">
            <span>GRID DEPLOYMENT:</span>
            <span className="text-slate-400">NEXT16/TS</span>
          </div>
          <div className="flex justify-between">
            <span>MAP ENGINE:</span>
            <span className="text-slate-400">LEAFLET v1.9</span>
          </div>
          <div className="flex justify-between">
            <span>PING RANGE:</span>
            <span className="text-emerald-500">22MS (ONLINE)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
