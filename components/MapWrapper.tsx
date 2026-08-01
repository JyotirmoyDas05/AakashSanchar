"use client";

import dynamic from "next/dynamic";
import { RadarSweep } from "@/components/RadarSweep";
import type { NewsEvent } from "@/types/news";

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#060913] text-slate-400 font-mono text-sm tracking-widest border border-brand-border">
      <div className="flex flex-col items-center gap-3">
        <RadarSweep theme="dark" />
        <span>INITIALIZING GEOGRAPHIC GRID...</span>
      </div>
    </div>
  ),
});

interface MapWrapperProps {
  events: NewsEvent[];
  selectedEventId: string | null;
  onEventSelect: (
    eventId: string | null,
    screenPos?: { x: number; y: number },
  ) => void;
  onClusterSelect?: (
    eventIds: string[],
    screenPos: { x: number; y: number },
  ) => void;
  center: [number, number];
  zoom: number;
  onViewportChange: (center: [number, number], zoom: number) => void;
  visualMode: "nodes" | "heat";
  theme?: "dark" | "light";
}

export default function MapWrapper(props: MapWrapperProps) {
  return <MapClient {...props} />;
}
