"use client";

import { type ReactNode, useState } from "react";
import type { TimeRange } from "@/types/news";

interface DashboardShellProps {
  logo?: ReactNode;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  leftRail: ReactNode;
  statsBar: ReactNode;
  map: ReactNode;
  insightsPanel: ReactNode;
  detailsPanel?: ReactNode;
  commandPalette?: ReactNode;
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "6h", label: "6H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "all", label: "ALL" },
];

export default function DashboardShell({
  logo,
  timeRange,
  onTimeRangeChange,
  leftRail,
  statsBar,
  map,
  insightsPanel,
  detailsPanel,
  commandPalette,
}: DashboardShellProps) {
  const [mobileMenu, setMobileMenu] = useState<"none" | "layers" | "insights">(
    "none",
  );

  return (
    <div className="flex h-dvh w-full flex-col bg-brand-bg text-slate-100 overflow-hidden font-sans select-none antialiased">
      {/* 1. Sticky Top Navigation Bar */}
      <header className="h-14 border-b border-brand-border bg-[#070b13] flex items-center justify-between px-4 shrink-0 z-40">
        <div className="flex items-center gap-3">
          {logo || (
            <div className="flex items-center gap-2">
              {/* Futuristic vector logo icon */}
              <svg
                className="h-5 w-5 text-cyan-500 animate-pulse"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h1 className="font-mono text-sm font-black tracking-wider text-white">
                AEGIS<span className="text-cyan-500 font-normal">SENTINEL</span>
              </h1>
            </div>
          )}
          <span className="hidden sm:inline rounded-full bg-slate-900 border border-brand-border px-2 py-0.5 text-[9px] font-mono text-slate-500 tracking-wider">
            SOVEREIGN OSINT GRID v1.0
          </span>
        </div>

        {/* Time Filter Segment Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded border border-brand-border bg-[#0d1423] p-0.5">
            {TIME_RANGES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onTimeRangeChange(t.value)}
                className={`rounded px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-all duration-150 ${
                  timeRange === t.value
                    ? "bg-brand-border text-cyan-400 border border-[#2b3e63]/60 shadow"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Mobile toggle controls */}
          <div className="flex md:hidden gap-1">
            <button
              type="button"
              onClick={() =>
                setMobileMenu(mobileMenu === "layers" ? "none" : "layers")
              }
              className={`rounded border p-1.5 ${
                mobileMenu === "layers"
                  ? "border-cyan-500 bg-[#0f192b]"
                  : "border-brand-border"
              }`}
              aria-label="Toggle Layers"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() =>
                setMobileMenu(mobileMenu === "insights" ? "none" : "insights")
              }
              className={`rounded border p-1.5 ${
                mobileMenu === "insights"
                  ? "border-cyan-500 bg-[#0f192b]"
                  : "border-brand-border"
              }`}
              aria-label="Toggle Insights"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main content container */}
      <div className="flex flex-1 w-full overflow-hidden relative">
        {/* Left control rail (Desktop-first) */}
        <aside className={`hidden md:block shrink-0 h-full`}>{leftRail}</aside>

        {/* Mobile Layers Drawer Overlay */}
        {mobileMenu === "layers" && (
          <div
            className="absolute inset-0 z-30 bg-black/60 md:hidden backdrop-blur-xs"
            onClick={() => setMobileMenu("none")}
          >
            <aside
              className="w-[240px] h-full bg-[#070b13] animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {leftRail}
            </aside>
          </div>
        )}

        {/* Central Map Canvas + Telemetry overlays */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Top telemetry bar */}
          <div className="p-3 shrink-0 z-10 bg-gradient-to-b from-[#060913] to-transparent">
            {statsBar}
          </div>

          {/* Central Map Layer */}
          <div className="flex-1 overflow-hidden relative z-0 border-t border-b border-brand-border">
            {map}
          </div>
        </main>

        {/* Right analytics panel (Desktop-first) */}
        <aside className="hidden lg:block shrink-0 h-full">
          {insightsPanel}
        </aside>

        {/* Mobile Insights Drawer Overlay */}
        {mobileMenu === "insights" && (
          <div
            className="absolute inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-xs"
            onClick={() => setMobileMenu("none")}
          >
            <aside
              className="absolute right-0 w-[300px] h-full bg-[#070b13] animate-in slide-in-from-right duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {insightsPanel}
            </aside>
          </div>
        )}

        {/* Dynamic details overlay drawer (Right docking overlay) */}
        {detailsPanel && (
          <div className="absolute top-0 right-0 z-20 h-full w-80 shadow-2xl border-l border-brand-border animate-in slide-in-from-right duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            {detailsPanel}
          </div>
        )}
      </div>

      {/* Floating Keyboard search palette */}
      {commandPalette}
    </div>
  );
}
