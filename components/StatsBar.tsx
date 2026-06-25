"use client";

import type { NewsEvent } from "@/types/news";

interface StatsBarProps {
  events: NewsEvent[];
  timeRangeLabel: string;
}

export default function StatsBar({ events, timeRangeLabel }: StatsBarProps) {
  const totalAlerts = events.length;

  // Count critical alerts (intensity >= 0.8)
  const criticalAlerts = events.filter((e) => e.intensity >= 0.8).length;

  // Find the latest active alert location name
  const latestAlert =
    events.length > 0
      ? [...events].sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime(),
        )[0]
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-brand-border bg-[#0d1423]/40 p-3 px-4 rounded-lg backdrop-blur-md text-slate-300 font-mono text-xs">
      {/* Grid status and updates */}
      <div className="flex items-center gap-6">
        {/* Radar Scanning animation */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            GRID ACTIVE
          </span>
        </div>

        {/* Dynamic Metric counters */}
        <div className="flex gap-4 border-l border-brand-border pl-6">
          <div>
            ALERTS INDEXED:{" "}
            <strong className="text-white tabular-nums">{totalAlerts}</strong>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            HIGH-SEVERITY:{" "}
            <strong
              className={`${criticalAlerts > 0 ? "text-rose-400" : "text-slate-400"} tabular-nums`}
            >
              {criticalAlerts}
            </strong>
          </div>
          <span className="text-slate-700">|</span>
          <div className="hidden sm:block">
            FILTER DEPTH:{" "}
            <strong className="text-cyan-400 uppercase">
              {timeRangeLabel}
            </strong>
          </div>
        </div>
      </div>

      {/* Latest Alert Ticker */}
      <div className="hidden lg:flex items-center gap-2 max-w-md truncate text-[11px] text-slate-400 border-l border-brand-border pl-6">
        <span className="text-rose-500 font-bold uppercase tracking-wider shrink-0 animate-pulse">
          LATEST FEED:
        </span>
        {latestAlert ? (
          <span className="truncate">
            <strong className="text-slate-300">
              {latestAlert.locationName}
            </strong>{" "}
            - {latestAlert.title}
          </span>
        ) : (
          <span className="text-slate-600 italic">
            No news feeds match active telemetry filters
          </span>
        )}
      </div>
    </div>
  );
}
