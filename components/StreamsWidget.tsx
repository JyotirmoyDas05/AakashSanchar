"use client";

import { useEffect, useState } from "react";
import FloatingWindow from "./FloatingWindow";

interface StreamData {
  id: string;
  name: string;
  coords: string;
  fps: number;
}

interface StreamsWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

const STREAMS: StreamData[] = [
  {
    id: "str-1",
    name: "Kyiv - Independence Sq",
    coords: "50.4501° N, 30.5234° E",
    fps: 24,
  },
  {
    id: "str-2",
    name: "Taipei - Ximending Hub",
    coords: "25.0421° N, 121.5083° E",
    fps: 30,
  },
  {
    id: "str-3",
    name: "Strait of Hormuz Channel",
    coords: "26.5667° N, 56.2500° E",
    fps: 15,
  },
  {
    id: "str-4",
    name: "Seoul - Gwanghwamun Gate",
    coords: "37.5759° N, 126.9768° E",
    fps: 24,
  },
  {
    id: "str-5",
    name: "Miami Port - Gate 4",
    coords: "25.7781° N, -80.1773° E",
    fps: 20,
  },
  {
    id: "str-6",
    name: "Tokyo - Shibuya Crossing",
    coords: "35.6580° N, 139.7016° E",
    fps: 30,
  },
];

export default function StreamsWidget({
  onClose,
  defaultPosition = { x: 140, y: 140 },
  zIndex,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
}: StreamsWidgetProps) {
  const isLight = theme === "light";
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [staticFlash, setStaticFlash] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timeInterval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toISOString().replace("T", " ").replace("Z", "");
      setTimestamps(STREAMS.map(() => timeStr));
    }, 1000);

    const staticInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * STREAMS.length);
      const streamId = STREAMS[randomIndex].id;

      setStaticFlash((prev) => ({ ...prev, [streamId]: true }));
      setTimeout(() => {
        setStaticFlash((prev) => ({ ...prev, [streamId]: false }));
      }, 150);
    }, 3000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(staticInterval);
    };
  }, []);

  return (
    <FloatingWindow
      title="LIVE FEED GRID SCANNER"
      theme={theme}
      layoutMode={layoutMode}
      icon={<span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />}
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={{ width: 540, height: 420 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div
        className={`w-full h-full font-mono flex flex-col justify-between min-h-0 ${
          isLight ? "bg-white text-slate-900" : "bg-black/40 text-slate-200"
        }`}
      >
        {/* Grid of video grids */}
        <div className="grid grid-cols-2 gap-2 p-2 flex-1 min-h-0 overflow-y-auto">
          {STREAMS.map((s, idx) => {
            const isFlickering = staticFlash[s.id];
            return (
              <div
                key={s.id}
                className={`relative aspect-video rounded border overflow-hidden group ${
                  isLight
                    ? "border-slate-300 bg-slate-100"
                    : "border-[#222] bg-[#09090b]"
                }`}
              >
                {/* Scanline pattern overlay */}
                <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-20" />

                {/* Live feedback camera canvas */}
                {isFlickering ? (
                  <div
                    className={`absolute inset-0 flex items-center justify-center select-none ${
                      isLight
                        ? "bg-slate-200 text-slate-600"
                        : "bg-slate-800 text-slate-600"
                    }`}
                  >
                    <div className="w-full h-full bg-noise opacity-40 animate-pulse" />
                  </div>
                ) : (
                  <div
                    className={`w-full h-full flex flex-col justify-between p-2 text-[9px] ${
                      isLight ? "text-cyan-800 font-bold" : "text-[#00c7fc]"
                    }`}
                  >
                    {/* Top line metadata */}
                    <div className="flex justify-between items-start">
                      <span
                        className={`px-1.5 py-0.5 rounded truncate max-w-37.5 ${
                          isLight
                            ? "bg-white/90 text-slate-900 border border-slate-200 shadow-sm"
                            : "bg-black/60 text-[#00c7fc]"
                        }`}
                      >
                        {s.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          isLight
                            ? "bg-red-50 text-red-700 border border-red-200 font-bold"
                            : "bg-black/60 text-red-400"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" />
                        LIVE
                      </span>
                    </div>

                    {/* Camera lens grid view */}
                    <div
                      className={`flex-1 flex items-center justify-center text-[10px] font-black uppercase tracking-widest pointer-events-none ${
                        isLight
                          ? "text-slate-400 opacity-60"
                          : "text-slate-800 opacity-20"
                      }`}
                    >
                      CCTV SCAN
                    </div>

                    {/* Bottom line coordinates & timestamp */}
                    <div
                      className={`flex justify-between items-end ${
                        isLight ? "text-slate-600 font-bold" : "text-slate-500"
                      }`}
                    >
                      <span className="truncate">{s.coords}</span>
                      <span className="text-right whitespace-nowrap text-[8px]">
                        {timestamps[idx] || "CONNECTING..."}
                      </span>
                    </div>
                  </div>
                )}

                {/* Hover effect overlays */}
                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            );
          })}
        </div>

        {/* Grid metadata summary */}
        <div
          className={`flex items-center justify-between border-t px-3 py-1.5 text-[9px] font-bold shrink-0 ${
            isLight
              ? "bg-slate-100 border-slate-200 text-slate-700"
              : "bg-[#090d16]/30 border-[#222] text-slate-500"
          }`}
        >
          <span>ACTIVE SENSORS: 6/6 ONLINE</span>
          <span>LATENCY DEPTH: 120MS</span>
        </div>
      </div>
    </FloatingWindow>
  );
}
