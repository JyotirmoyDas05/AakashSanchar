"use client";

import { type ReactNode, useEffect, useState } from "react";

interface DashboardShellProps {
  activeTab: "map" | "wire";
  onTabChange: (tab: "map" | "wire") => void;
  leftRail: ReactNode;
  tickerBar: ReactNode;
  contentWorkspace: ReactNode;
  floatingWindows: ReactNode;
  locateWidget?: ReactNode;
  filterWidget?: ReactNode;
  settingsWidget?: ReactNode;
  onToggleLocate: () => void;
  onToggleFilter: () => void;
  onToggleSettings?: () => void;
  isLocateOpen: boolean;
  isFilterOpen: boolean;
  isSettingsOpen?: boolean;
  onToggleSearch?: () => void;
  commandPalette?: ReactNode;
  layoutMode?: "sidebar" | "floating";
  theme?: "dark" | "light";
  timezone?: string;
  dateFormat?: string;
}

import AiHeaderStatus from "@/components/AiHeaderStatus";

export default function DashboardShell({
  activeTab,
  onTabChange,
  leftRail,
  tickerBar,
  contentWorkspace,
  floatingWindows,
  locateWidget,
  filterWidget,
  settingsWidget,
  onToggleLocate,
  onToggleFilter,
  onToggleSettings,
  onToggleSearch,
  isLocateOpen,
  isFilterOpen,
  isSettingsOpen = false,
  commandPalette,
  layoutMode = "sidebar",
  theme = "dark",
  timezone = "UTC",
  dateFormat = "ISO",
}: DashboardShellProps) {
  const isLight = theme === "light";
  const [systemTime, setSystemTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tzTarget =
        timezone === "EST"
          ? "America/New_York"
          : timezone === "PST"
            ? "America/Los_Angeles"
            : timezone === "CET"
              ? "Europe/Berlin"
              : timezone === "JST"
                ? "Asia/Tokyo"
                : timezone === "LOCAL"
                  ? undefined
                  : "UTC";

      let dateStr = "";
      if (dateFormat === "EU") {
        dateStr = now.toLocaleDateString("en-GB", {
          timeZone: tzTarget,
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      } else if (dateFormat === "US") {
        dateStr = now.toLocaleDateString("en-US", {
          timeZone: tzTarget,
          month: "short",
          day: "2-digit",
          year: "numeric",
        });
      } else {
        // ISO
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tzTarget,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now);
        dateStr = parts;
      }

      const timeStr = now.toLocaleTimeString("en-US", {
        timeZone: tzTarget,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const tzLabel = timezone === "LOCAL" ? "LOCAL" : timezone;
      setSystemTime(`${dateStr} // ${timeStr} ${tzLabel}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone, dateFormat]);

  return (
    <div
      className={`flex h-dvh w-full flex-col overflow-hidden font-sans select-none antialiased border ${
        isLight
          ? "bg-slate-50 text-slate-900 border-slate-200"
          : "bg-brand-bg text-slate-200 border-brand-border"
      }`}
    >
      {/* 1. Header Navigation Bar */}
      <header
        className={`h-12 border-b flex items-center justify-between px-4 shrink-0 z-40 font-mono relative ${
          isLight
            ? "bg-white border-slate-200 text-slate-900 shadow-sm"
            : "bg-[#0a0a0a] border-brand-border text-slate-200"
        }`}
      >
        {/* Left: Logo + Tabs — natural width */}
        <div className="flex items-center gap-6 shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#06b6d4]" />
            <h1
              className={`text-xs font-black tracking-widest uppercase ${
                isLight ? "text-slate-900" : "text-white"
              }`}
            >
              AAKASH<span className="text-cyan-500 font-normal">SANCHAR</span>
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1">
            {(["map", "wire"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={`px-3.5 py-1 text-[10px] font-bold tracking-widest uppercase transition-all border ${
                  activeTab === tab
                    ? isLight
                      ? "bg-cyan-50 border-cyan-300 text-cyan-800 font-bold shadow-sm"
                      : "bg-[#18181b] border-[#333] text-cyan-400"
                    : isLight
                      ? "border-transparent text-slate-600 hover:text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-350"
                }`}
              >
                THE {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Middle: Command Palette — absolutely centered so it never shifts */}
        {onToggleSearch && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex">
            <button
              type="button"
              onClick={onToggleSearch}
              className={`flex items-center gap-2.5 px-3 py-1 rounded-md text-xs font-mono transition-all border shadow-sm ${
                isLight
                  ? "bg-slate-100/90 border-slate-300 text-slate-600 hover:bg-slate-200 hover:text-slate-900 hover:border-slate-400"
                  : "bg-[#141416]/90 border-[#2b2b30] text-slate-400 hover:bg-[#1c1c20] hover:text-slate-200 hover:border-cyan-500/50"
              }`}
              title="Search Intelligence (Press / or Ctrl+K)"
            >
              <svg
                className="h-3.5 w-3.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.3-4.3"
                />
              </svg>
              <span className="text-[11px] font-medium tracking-wide">
                Search intelligence, regions, threats...
              </span>
              <kbd
                className={`ml-2 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-600"
                    : "bg-black/40 border-[#38383e] text-slate-400"
                }`}
              >
                /
              </kbd>
            </button>
          </div>
        )}

        {/* Right: System Time & AI status — fixed min-width so text changes never shift layout */}
        <div
          className={`hidden md:flex items-center gap-3 text-[9px] font-bold shrink-0 min-w-55 justify-end ${
            isLight ? "text-slate-700" : "text-slate-500"
          }`}
        >
          <AiHeaderStatus theme={theme} />
          <span className="tabular-nums">{systemTime}</span>
        </div>
      </header>

      {/* 2. Main app workspace */}
      <div className="flex flex-1 w-full overflow-hidden relative">
        {/* Left rail menu */}
        <aside
          className={`h-full z-1050 transition-all duration-300 ease-in-out ${
            layoutMode === "sidebar"
              ? "w-14 shrink-0"
              : "w-0 overflow-visible relative"
          }`}
        >
          {leftRail}
        </aside>

        {/* Central main workspace area */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative z-0">
          <div className="flex-1 overflow-hidden relative">
            {contentWorkspace}

            {/* Bottom Right Map Actions Overlay (Locate / Filter / Settings widgets) */}
            {activeTab === "map" && (
              <div className="absolute bottom-4 right-4 z-1050 flex items-center gap-1.5 font-mono text-[9px] font-bold">
                <button
                  type="button"
                  onClick={onToggleLocate}
                  className={`rounded border px-2.5 py-1.5 transition-all flex items-center gap-1.5 ${
                    isLocateOpen
                      ? isLight
                        ? "border-cyan-600 bg-cyan-100/90 text-cyan-900 shadow-md font-bold"
                        : "border-cyan-500 bg-[#0d1e2e]/85 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                      : isLight
                        ? "border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                        : "border-[#222] bg-brand-bg/85 text-slate-400 hover:bg-[#121214] hover:text-slate-200"
                  }`}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  LOCATE
                </button>

                <button
                  type="button"
                  onClick={onToggleFilter}
                  className={`rounded border px-2.5 py-1.5 transition-all flex items-center gap-1.5 ${
                    isFilterOpen
                      ? isLight
                        ? "border-cyan-600 bg-cyan-100/90 text-cyan-900 shadow-md font-bold"
                        : "border-cyan-500 bg-[#0d1e2e]/85 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                      : isLight
                        ? "border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                        : "border-[#222] bg-brand-bg/85 text-slate-400 hover:bg-[#121214] hover:text-slate-200"
                  }`}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.707 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  FILTER
                </button>

                {onToggleSettings && (
                  <button
                    type="button"
                    onClick={onToggleSettings}
                    className={`rounded border px-2.5 py-1.5 transition-all flex items-center gap-1.5 ${
                      isSettingsOpen
                        ? isLight
                          ? "border-cyan-600 bg-cyan-100/90 text-cyan-900 shadow-md font-bold"
                          : "border-cyan-500 bg-[#0d1e2e]/85 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                        : isLight
                          ? "border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                          : "border-[#222] bg-brand-bg/85 text-slate-400 hover:bg-[#121214] hover:text-slate-200"
                    }`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    SETTINGS
                  </button>
                )}
              </div>
            )}

            {/* Action Widgets Modals overlay */}
            {locateWidget}
            {filterWidget}
            {settingsWidget}
          </div>
        </main>

        {/* Floating panel overlay instances */}
        {floatingWindows}
      </div>

      {/* 3. Bottom scrolling news ticker */}
      {tickerBar}

      {/* Global command palette search overlay */}
      {commandPalette}
    </div>
  );
}
