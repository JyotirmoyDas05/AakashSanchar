"use client";

import { useState } from "react";

interface LocationItem {
  name: string;
  coords: [number, number];
  zoom: number;
}

interface LocateWidgetProps {
  onLocate: (coords: [number, number], zoom: number) => void;
  onClose: () => void;
  theme?: "dark" | "light";
}

const LOCATIONS: LocationItem[] = [
  { name: "Strait of Hormuz", coords: [26.5667, 56.25], zoom: 7 },
  { name: "Zaporizhzhia, Ukraine", coords: [47.508, 35.118], zoom: 9 },
  { name: "Caracas, Venezuela", coords: [10.5, -66.903], zoom: 8 },
  { name: "London, United Kingdom", coords: [51.5074, -0.1278], zoom: 9 },
  { name: "Bundibugyo, Uganda", coords: [0.706, 30.063], zoom: 8 },
  { name: "Miami Harbor, Florida", coords: [25.7617, -80.1918], zoom: 10 },
  { name: "Tokyo Wards, Japan", coords: [35.6762, 139.6503], zoom: 9 },
  { name: "Washington D.C., USA", coords: [38.9072, -77.0369], zoom: 10 },
  { name: "Doha, Qatar", coords: [25.2854, 51.531], zoom: 10 },
  { name: "Taipei, Taiwan", coords: [25.033, 121.5654], zoom: 9 },
  { name: "Singapore Harbor", coords: [1.3521, 103.8198], zoom: 10 },
];

export default function LocateWidget({
  onLocate,
  onClose,
  theme = "dark",
}: LocateWidgetProps) {
  const isLight = theme === "light";
  const [search, setSearch] = useState("");

  const filtered = LOCATIONS.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className={`absolute right-4 bottom-16 z-1050 w-72 rounded-lg border font-mono select-none overflow-hidden ${
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
          LOCATE GRID COORDINATE
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

      <div
        className={`p-2 space-y-2 ${
          isLight ? "bg-white text-slate-900" : "bg-brand-bg text-slate-200"
        }`}
      >
        {/* Search filter input */}
        <input
          type="text"
          placeholder="Filter country / sector..."
          className={`w-full rounded border px-2.5 py-1.5 text-xs outline-none ${
            isLight
              ? "bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-500 focus:border-cyan-600"
              : "bg-black/60 border-[#222] text-slate-200 placeholder-slate-500 focus:border-cyan-500"
          }`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Location selectors list */}
        <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
          {filtered.length === 0 ? (
            <div
              className={`py-6 text-center text-xs italic ${
                isLight ? "text-slate-500" : "text-slate-600"
              }`}
            >
              NO LOCATIONS MATCHED
            </div>
          ) : (
            filtered.map((l) => (
              <button
                key={l.name}
                type="button"
                onClick={() => {
                  onLocate(l.coords, l.zoom);
                  onClose();
                }}
                className={`flex items-center justify-between w-full rounded p-2 text-left text-xs transition-colors ${
                  isLight
                    ? "text-slate-800 hover:bg-cyan-50 hover:text-cyan-900 font-medium"
                    : "text-slate-400 hover:bg-[#0d0d0e] hover:text-white"
                }`}
              >
                <span className="font-semibold">{l.name}</span>
                <span
                  className={`text-[9px] ${
                    isLight ? "text-slate-500 font-bold" : "text-slate-650"
                  }`}
                >
                  {l.coords[0].toFixed(2)}, {l.coords[1].toFixed(2)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
