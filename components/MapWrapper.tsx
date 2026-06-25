"use client";

import dynamic from "next/dynamic";
import type { NewsEvent } from "@/types/news";

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#060913] text-slate-400 font-mono text-sm tracking-widest border border-brand-border">
      <div className="flex flex-col items-center gap-2">
        <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-cyan-500 animate-spin" />
        <span>INITIALIZING GEOGRAPHIC GRID...</span>
      </div>
    </div>
  ),
});

interface MapWrapperProps {
  events: NewsEvent[];
  selectedEventId: string | null;
  onEventSelect: (eventId: string | null) => void;
  center: [number, number];
  zoom: number;
  onViewportChange: (center: [number, number], zoom: number) => void;
  visualMode: "nodes" | "heat";
}

export default function MapWrapper(props: MapWrapperProps) {
  return <MapClient {...props} />;
}
