"use client";

import type React from "react";

interface LeftControlRailProps {
  activeWidgets: string[];
  onToggleWidget: (widget: string) => void;
  layoutMode?: "sidebar" | "floating";
  theme?: "dark" | "light";
}

interface WidgetItem {
  id: string;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

export default function LeftControlRail({
  activeWidgets,
  onToggleWidget,
  layoutMode = "sidebar",
  theme = "dark",
}: LeftControlRailProps) {
  const isLight = theme === "light";

  const widgets: WidgetItem[] = [
    {
      id: "wire",
      label: "WIRE",
      shortcut: "1",
      icon: (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
      ),
    },
    {
      id: "stocks",
      label: "STOCKS",
      shortcut: "2",
      icon: (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect
            x="4"
            y="10"
            width="6"
            height="8"
            rx="1.5"
            strokeLinecap="round"
          />
          <rect
            x="14"
            y="7"
            width="6"
            height="8"
            rx="1.5"
            strokeLinecap="round"
          />
          <path d="M7 6v4" strokeLinecap="round" />
          <path d="M17 3v4" strokeLinecap="round" />
          <path d="M7 18v3" strokeLinecap="round" />
          <path d="M17 15v4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "streams",
      label: "STREAMS",
      shortcut: "3",
      icon: (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect
            x="3"
            y="8"
            width="18"
            height="13"
            rx="2"
            ry="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="16 3 12 8 8 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "cameras",
      label: "CAMERAS",
      shortcut: "4",
      icon: (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "outbreaks",
      label: "OUTBREAKS",
      shortcut: "5",
      icon: (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
  ];

  // 1. Floating Rail Mode (World Monitor style)
  if (layoutMode === "floating") {
    return (
      <div
        className={`absolute left-4 bottom-4 z-1050 flex flex-col gap-1 p-1.5 rounded-lg border backdrop-blur-md w-37.5 font-mono select-none transition-all duration-200 ${
          isLight
            ? "border-cyan-400/40 bg-white/95 text-slate-800 shadow-xl"
            : "border-cyan-500/25 bg-[#0a0a0c]/90 text-slate-300 shadow-2xl"
        }`}
      >
        {widgets.map((w) => {
          const isActive = activeWidgets.includes(w.id);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onToggleWidget(w.id)}
              className={`relative flex h-8 w-full items-center justify-between px-2.5 rounded transition-all group border font-mono text-[10px] tracking-wider uppercase ${
                isActive
                  ? isLight
                    ? "bg-cyan-100 border-cyan-500 text-cyan-900 font-bold shadow-sm"
                    : "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : isLight
                    ? "bg-transparent border-transparent text-slate-700 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-800"
                    : "bg-transparent border-transparent text-slate-400 hover:bg-cyan-500/10 hover:border-cyan-500/40 hover:text-cyan-300"
              }`}
              title={`${w.label} (Alt + ${w.shortcut})`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={
                    isActive
                      ? isLight
                        ? "text-cyan-700 font-bold"
                        : "text-cyan-400"
                      : isLight
                        ? "text-slate-600 group-hover:text-cyan-700"
                        : "text-slate-400 group-hover:text-cyan-300"
                  }
                >
                  {w.icon}
                </span>
                <span className="font-bold hidden md:inline">{w.label}</span>
              </div>
              <span className="hidden md:inline text-[9px] tabular-nums text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">
                {w.shortcut}
              </span>
              {/* Mobile Active Indicator Dot */}
              {isActive && (
                <div className="md:hidden absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // 2. Fixed Sidebar Mode (Classic style)
  return (
    <div
      className={`flex h-full w-14 flex-col items-center py-3 border-r select-none shrink-0 z-1050 transition-all duration-300 ease-in-out ${
        isLight
          ? "bg-white border-slate-200 text-slate-700 shadow-md"
          : "bg-[#0a0a0a] border-brand-border text-slate-400"
      }`}
    >
      {/* Widgets list stack */}
      <div className="flex flex-col gap-3.5 flex-1 items-center w-full">
        {widgets.map((w) => {
          const isActive = activeWidgets.includes(w.id);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onToggleWidget(w.id)}
              className={`relative flex h-10 w-10 items-center justify-center rounded transition-all group ${
                isActive
                  ? isLight
                    ? "bg-cyan-50 text-cyan-800 border border-cyan-400 shadow-sm font-bold"
                    : "bg-[#18181b] text-cyan-400 border border-[#333]"
                  : isLight
                    ? "hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent"
                    : "hover:bg-[#121214] text-slate-500 hover:text-slate-200 border border-transparent"
              }`}
              title={w.label}
            >
              {w.icon}
              {/* Tooltip hint */}
              <div
                className={`absolute left-12 scale-0 group-hover:scale-100 transition-transform origin-left z-50 text-[9px] font-bold tracking-wider rounded px-2 py-1 uppercase whitespace-nowrap border ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-800 shadow-lg"
                    : "bg-[#0d0d0e] border-[#222] text-slate-300 shadow-xl"
                }`}
              >
                {w.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
