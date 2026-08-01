"use client";

import FloatingWindow from "./FloatingWindow";

export interface SettingsState {
  layoutMode: "sidebar" | "floating";
  timezone: string;
  dateFormat: string;
  theme: "dark" | "light";
}

interface SettingsWidgetProps {
  settings: SettingsState;
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
}

export default function SettingsWidget({
  settings,
  onUpdateSettings,
  onClose,
  zIndex = 1100,
  onFocus,
}: SettingsWidgetProps) {
  const isLight = settings.theme === "light";

  const timezoneOptions = [
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
    { value: "LOCAL", label: "System Local Time" },
    { value: "EST", label: "US Eastern (UTC-5)" },
    { value: "PST", label: "US Pacific (UTC-8)" },
    { value: "CET", label: "Central European (UTC+1)" },
    { value: "JST", label: "Japan Standard (UTC+9)" },
  ];

  const dateFormatOptions = [
    { value: "ISO", label: "YYYY-MM-DD HH:mm:ss" },
    { value: "EU", label: "DD/MM/YYYY HH:mm" },
    { value: "US", label: "MMM DD, YYYY HH:mm:ss" },
  ];

  const shortcutsList = [
    { label: "Toggle Wire Workspace", key: "Alt + 1" },
    { label: "Toggle Stocks Panel", key: "Alt + 2" },
    { label: "Toggle Live Streams", key: "Alt + 3" },
    { label: "Toggle Traffic & Cameras", key: "Alt + 4" },
    { label: "Toggle Outbreaks Tracker", key: "Alt + 5" },
    { label: "Toggle Map Layers Filter", key: "L" },
    { label: "Global Command Palette", key: "Ctrl + K or /" },
    { label: "Minimize Focused Window", key: "Esc" },
  ];

  return (
    <FloatingWindow
      title="SETTINGS"
      theme={settings.theme}
      icon={
        <div className="relative flex items-center justify-center h-3.5 w-3.5">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
        </div>
      }
      onClose={onClose}
      defaultPosition={{
        x:
          typeof window !== "undefined"
            ? Math.max(20, window.innerWidth - 480)
            : 100,
        y: 70,
      }}
      defaultSize={{ width: 440, height: 520 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div
        className={`h-full w-full font-mono text-xs overflow-y-auto p-4 flex flex-col gap-5 select-none custom-scrollbar ${
          isLight ? "bg-white text-slate-800" : "bg-[#0a0a0c]/95 text-slate-300"
        }`}
      >
        {/* 1. SIDEBAR LAYOUT TOGGLE */}
        <div className="flex flex-col gap-2">
          <div
            className={`text-[10px] font-bold tracking-wider uppercase border-b pb-1 flex items-center justify-between ${
              isLight
                ? "text-cyan-700 border-cyan-300"
                : "text-cyan-400/90 border-cyan-500/20"
            }`}
          >
            <span>Sidebar Layout</span>
            <span className="text-[9px] text-slate-500 font-normal">
              RAIL DISPLAY MODE
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => onUpdateSettings({ layoutMode: "sidebar" })}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border rounded transition-all flex items-center justify-center gap-2 ${
                settings.layoutMode === "sidebar"
                  ? isLight
                    ? "border-cyan-600 text-cyan-900 bg-cyan-100 font-bold shadow-sm"
                    : "border-cyan-500 text-cyan-400 bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : isLight
                    ? "border-slate-300 text-slate-700 hover:border-cyan-400 hover:text-slate-900 bg-slate-50"
                    : "border-[#222] text-slate-400 hover:border-cyan-500/60 hover:text-slate-200 bg-[#121214]"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
              Fixed Sidebar
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ layoutMode: "floating" })}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border rounded transition-all flex items-center justify-center gap-2 ${
                settings.layoutMode === "floating"
                  ? isLight
                    ? "border-cyan-600 text-cyan-900 bg-cyan-100 font-bold shadow-sm"
                    : "border-cyan-500 text-cyan-400 bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : isLight
                    ? "border-slate-300 text-slate-700 hover:border-cyan-400 hover:text-slate-900 bg-slate-50"
                    : "border-[#222] text-slate-400 hover:border-cyan-500/60 hover:text-slate-200 bg-[#121214]"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7v10"
                />
              </svg>
              Minimalist Floating
            </button>
          </div>
        </div>

        {/* 2. TIMEZONE SELECTION */}
        <div className="flex flex-col gap-2">
          <div
            className={`text-[10px] font-bold tracking-wider uppercase border-b pb-1 flex items-center justify-between ${
              isLight
                ? "text-cyan-700 border-cyan-300"
                : "text-cyan-400/90 border-cyan-500/20"
            }`}
          >
            <span>Timezone</span>
            <span className="text-[9px] text-slate-500 font-normal">
              DISPLAY TIME REFERENCE
            </span>
          </div>
          <select
            value={settings.timezone}
            onChange={(e) => onUpdateSettings({ timezone: e.target.value })}
            className={`w-full text-[11px] font-mono rounded px-2.5 py-1.5 outline-none transition-colors cursor-pointer appearance-none border ${
              isLight
                ? "bg-white border-slate-300 text-slate-900 focus:border-cyan-600"
                : "bg-[#121214] border-[#222] text-slate-200 hover:border-cyan-500/60 focus:border-cyan-500"
            }`}
          >
            {timezoneOptions.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className={
                  isLight
                    ? "bg-white text-slate-900"
                    : "bg-[#0a0a0c] text-slate-200"
                }
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. DATE FORMAT */}
        <div className="flex flex-col gap-2">
          <div
            className={`text-[10px] font-bold tracking-wider uppercase border-b pb-1 flex items-center justify-between ${
              isLight
                ? "text-cyan-700 border-cyan-300"
                : "text-cyan-400/90 border-cyan-500/20"
            }`}
          >
            <span>Date Format</span>
            <span className="text-[9px] text-slate-500 font-normal">
              TIMESTAMPS DISPLAY
            </span>
          </div>
          <select
            value={settings.dateFormat}
            onChange={(e) => onUpdateSettings({ dateFormat: e.target.value })}
            className={`w-full text-[11px] font-mono rounded px-2.5 py-1.5 outline-none transition-colors cursor-pointer appearance-none border ${
              isLight
                ? "bg-white border-slate-300 text-slate-900 focus:border-cyan-600"
                : "bg-[#121214] border-[#222] text-slate-200 hover:border-cyan-500/60 focus:border-cyan-500"
            }`}
          >
            {dateFormatOptions.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className={
                  isLight
                    ? "bg-white text-slate-900"
                    : "bg-[#0a0a0c] text-slate-200"
                }
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. THEME SELECTION */}
        <div className="flex flex-col gap-2">
          <div
            className={`text-[10px] font-bold tracking-wider uppercase border-b pb-1 flex items-center justify-between ${
              isLight
                ? "text-cyan-700 border-cyan-300"
                : "text-cyan-400/90 border-cyan-500/20"
            }`}
          >
            <span>Theme Preset</span>
            <span className="text-[9px] text-slate-500 font-normal">
              COLOR SCHEME
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[
              { id: "dark", label: "Dark" },
              { id: "light", label: "Light" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  onUpdateSettings({ theme: t.id as "dark" | "light" })
                }
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider border rounded transition-all text-center ${
                  settings.theme === t.id
                    ? isLight
                      ? "border-cyan-600 text-cyan-900 bg-cyan-100 font-bold shadow-sm"
                      : "border-cyan-500 text-cyan-400 bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : isLight
                      ? "border-slate-300 text-slate-700 hover:border-cyan-400 hover:text-slate-900 bg-slate-50"
                      : "border-[#222] text-slate-400 hover:border-[#333] bg-[#121214]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. KEYBOARD SHORTCUTS REFERENCE */}
        <div className="flex flex-col gap-2">
          <div
            className={`text-[10px] font-bold tracking-wider uppercase border-b pb-1 flex items-center justify-between ${
              isLight
                ? "text-cyan-700 border-cyan-300"
                : "text-cyan-400/90 border-cyan-500/20"
            }`}
          >
            <span>Keyboard Shortcuts</span>
            <span className="text-[9px] text-slate-500 font-normal">
              HOTKEYS
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            {shortcutsList.map((s) => (
              <div
                key={s.key}
                className={`flex items-center justify-between py-1 px-2 rounded border ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-[#121214]/60 border-[#1e1e22] text-slate-400"
                }`}
              >
                <span className="text-[10px]">{s.label}</span>
                <kbd
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm border ${
                    isLight
                      ? "bg-white border-cyan-300 text-cyan-800 font-bold"
                      : "bg-[#0a0a0c] border-cyan-500/30 text-cyan-400"
                  }`}
                >
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FloatingWindow>
  );
}
