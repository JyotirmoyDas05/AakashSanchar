"use client";

import { useState } from "react";
import { labelForCategory } from "@/lib/filterEvents";
import { formatTime } from "@/lib/formatTime";
import type { NewsCategory, NewsEvent } from "@/types/news";

interface WireWorkspaceProps {
  events: NewsEvent[];
  onEventSelect: (eventId: string, coords: [number, number]) => void;
  theme?: "dark" | "light";
}

const CATEGORY_COLORS: Record<
  NewsCategory,
  { text: string; bg: string; border: string }
> = {
  news: {
    text: "text-slate-400",
    bg: "bg-slate-500/15",
    border: "border-slate-500/30",
  },
  conflict: {
    text: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
  },
  disaster: {
    text: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
  },
  health: {
    text: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
  },
  space: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
  },
};

export default function WireWorkspace({
  events,
  onEventSelect,
  theme = "dark",
}: WireWorkspaceProps) {
  const isLight = theme === "light";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<NewsCategory | "all">(
    "all",
  );

  const filtered = events.filter((e) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      e.title.toLowerCase().includes(s) ||
      e.description.toLowerCase().includes(s) ||
      e.locationName.toLowerCase().includes(s) ||
      e.source.toLowerCase().includes(s);

    const matchesCategory =
      activeCategory === "all" || e.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div
      className={`h-full w-full flex flex-col font-mono select-none overflow-hidden border ${
        isLight
          ? "bg-slate-50 text-slate-900 border-slate-200"
          : "bg-brand-bg text-slate-350 border-brand-border"
      }`}
    >
      {/* Search and category filters bar */}
      <div
        className={`p-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isLight
            ? "bg-white border-slate-200 text-slate-900 shadow-sm"
            : "bg-[#0a0a0a] border-brand-border text-slate-200"
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-60">
          <svg
            className={`h-4.5 w-4.5 shrink-0 ${
              isLight ? "text-slate-600" : "text-slate-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2 12h4l2-6 3 12 2.5-9 1.5 3H22"
            />
          </svg>
          <input
            type="text"
            placeholder="Search active wire logs..."
            className={`flex-1 rounded border px-2.5 py-1 text-xs outline-none ${
              isLight
                ? "bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-500 focus:border-cyan-600"
                : "bg-black/60 border-[#222] text-slate-200 placeholder-slate-600 focus:border-cyan-500"
            }`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category segment switches */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase transition-all ${
              activeCategory === "all"
                ? isLight
                  ? "bg-cyan-100 text-cyan-900 border border-cyan-400 font-bold shadow-sm"
                  : "bg-brand-border text-white border border-[#333]"
                : isLight
                  ? "border border-transparent text-slate-600 hover:text-slate-900"
                  : "border border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            ALL
          </button>
          {(
            [
              "news",
              "conflict",
              "disaster",
              "health",
              "space",
            ] as NewsCategory[]
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase transition-all ${
                activeCategory === cat
                  ? isLight
                    ? "bg-cyan-100 text-cyan-900 border border-cyan-400 font-bold shadow-sm"
                    : "bg-brand-border text-white border border-[#333]"
                  : isLight
                    ? "border border-transparent text-slate-600 hover:text-slate-900"
                    : "border border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {labelForCategory(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Wire feed scrolling list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div
            className={`py-12 text-center text-xs italic ${
              isLight ? "text-slate-500" : "text-slate-650"
            }`}
          >
            NO FEED CHANNELS RETRIEVED ON ACTIVE MATRIX
          </div>
        ) : (
          filtered.map((ev) => {
            const styles = CATEGORY_COLORS[ev.category];
            return (
              <div
                key={ev.id}
                onClick={() => onEventSelect(ev.id, [ev.lat, ev.lng])}
                className={`group cursor-pointer rounded border p-3 transition-colors ${
                  isLight
                    ? "bg-white border-slate-200 hover:bg-slate-100/80 shadow-sm"
                    : "bg-[#07070a] border-[#1e1e24] hover:bg-[#0d0d10]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[9px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase border ${styles.bg} ${styles.text} ${styles.border}`}
                    >
                      {labelForCategory(ev.category)}
                    </span>
                    <span
                      className={`font-semibold ${
                        isLight ? "text-cyan-700 font-bold" : "text-cyan-500"
                      }`}
                    >
                      {ev.locationName}
                    </span>
                  </div>
                  <span
                    className={isLight ? "text-slate-600" : "text-slate-500"}
                  >
                    {formatTime(ev.publishedAt)}
                  </span>
                </div>

                <h3
                  className={`mt-1.5 text-sm font-bold transition-colors ${
                    isLight
                      ? "text-slate-900 group-hover:text-cyan-800"
                      : "text-slate-200 group-hover:text-cyan-400"
                  }`}
                >
                  {ev.title}
                </h3>

                <p
                  className={`mt-1 text-xs line-clamp-2 leading-relaxed ${
                    isLight ? "text-slate-700" : "text-slate-400"
                  }`}
                >
                  {ev.description}
                </p>

                <div
                  className={`mt-2 flex items-center justify-between text-[9px] ${
                    isLight ? "text-slate-500 font-bold" : "text-slate-600"
                  }`}
                >
                  <span>SOURCE: {ev.source.toUpperCase()}</span>
                  <span>
                    GRID: {ev.lat.toFixed(2)}, {ev.lng.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
