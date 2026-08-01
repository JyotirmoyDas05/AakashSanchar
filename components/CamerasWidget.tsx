"use client";

import { useEffect, useState } from "react";
import FloatingWindow from "./FloatingWindow";

interface CameraItem {
  id: string;
  name: string;
  location: string;
  weather: string;
  coords: string;
}

interface CamerasWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

const CAMERAS: CameraItem[] = [
  {
    id: "cam-1",
    name: "Athens - Acropolis Hill",
    location: "Athens, Greece",
    weather: "Clear, 28°C",
    coords: "37.9715° N, 23.7257° E",
  },
  {
    id: "cam-2",
    name: "Zurich - Limmat River",
    location: "Zurich, Switzerland",
    weather: "Overcast, 18°C",
    coords: "47.3769° N, 8.5417° E",
  },
  {
    id: "cam-3",
    name: "Bergen - Bryggen Wharfs",
    location: "Bergen, Norway",
    weather: "Rain, 11°C",
    coords: "60.3913° N, 5.3221° E",
  },
  {
    id: "cam-4",
    name: "Berlin - Brandenburg Gate",
    location: "Berlin, Germany",
    weather: "Mist, 16°C",
    coords: "52.5163° N, 13.3777° E",
  },
];

export default function CamerasWidget({
  onClose,
  defaultPosition = { x: 180, y: 180 },
  zIndex,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
}: CamerasWidgetProps) {
  const isLight = theme === "light";
  const [selectedCam, setSelectedCam] = useState<CameraItem>(CAMERAS[0]);
  const [interference, setInterference] = useState(false);

  useEffect(() => {
    setInterference(true);
    const timer = setTimeout(() => setInterference(false), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <FloatingWindow
      title="OSINT WEBCAM MONITORS"
      theme={theme}
      layoutMode={layoutMode}
      icon={
        <svg
          className="h-4.5 w-4.5 text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      }
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={{ width: 450, height: 420 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      {/* Main video viewer */}
      <div
        className={`w-full h-full p-2 space-y-2 font-mono flex flex-col justify-between min-h-0 overflow-y-auto ${
          isLight ? "bg-white text-slate-900" : "bg-black/40 text-slate-200"
        }`}
      >
        <div
          className={`relative aspect-video w-full rounded border overflow-hidden shrink-0 ${
            isLight
              ? "border-slate-300 bg-slate-100"
              : "border-[#222] bg-[#09090b]"
          }`}
        >
          {interference ? (
            <div
              className={`absolute inset-0 flex items-center justify-center ${
                isLight ? "bg-slate-200" : "bg-slate-800"
              }`}
            >
              <div className="w-full h-full bg-noise opacity-50" />
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col justify-between p-2.5">
              {/* Overlay metadata */}
              <div className="flex justify-between items-start text-[9px] font-bold">
                <span
                  className={`px-1.5 py-0.5 rounded truncate max-w-40 ${
                    isLight
                      ? "bg-white/90 text-slate-900 border border-slate-200 shadow-sm"
                      : "bg-black/60 text-cyan-400"
                  }`}
                >
                  {selectedCam.name}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded uppercase animate-pulse ${
                    isLight
                      ? "bg-red-50 text-red-700 border border-red-200 font-bold"
                      : "bg-black/60 text-red-400"
                  }`}
                >
                  REC ACTIVE
                </span>
              </div>

              {/* Scope/Grid graphic lines */}
              <div className="absolute inset-0 border border-slate-900 pointer-events-none opacity-20 flex items-center justify-center">
                <div className="h-full w-px bg-cyan-500" />
                <div className="w-full h-px bg-cyan-500" />
              </div>

              {/* Bottom location info */}
              <div
                className={`flex justify-between items-end text-[8px] font-bold z-10 ${
                  isLight ? "text-slate-600" : "text-slate-500"
                }`}
              >
                <span>{selectedCam.coords}</span>
                <span>{selectedCam.weather}</span>
              </div>
            </div>
          )}
        </div>

        {/* Camera Selector buttons list */}
        <div className="space-y-1 flex-1 min-h-0 flex flex-col justify-end">
          <span
            className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${
              isLight ? "text-slate-600" : "text-slate-500"
            }`}
          >
            SELECT MONITOR CHANNEL
          </span>
          <div className="grid grid-cols-2 gap-1.5 shrink-0">
            {CAMERAS.map((c) => {
              const isSelected = c.id === selectedCam.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCam(c)}
                  className={`rounded border p-2 text-left text-xs transition-all ${
                    isSelected
                      ? isLight
                        ? "border-cyan-600 bg-cyan-100/90 text-cyan-900 font-bold shadow-sm"
                        : "border-cyan-500 bg-[#0d1e2e]/55 text-white"
                      : isLight
                        ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        : "border-transparent bg-brand-border/40 text-slate-400 hover:bg-brand-border"
                  }`}
                >
                  <div className="font-bold truncate text-[10px]">
                    {c.location}
                  </div>
                  <div
                    className={`text-[8px] truncate mt-0.5 ${
                      isLight ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    {c.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </FloatingWindow>
  );
}
