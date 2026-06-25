"use client";

import dynamic from "next/dynamic";
import type { NewsEvent } from "@/types/news";

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
});

interface MapWrapperProps {
  events: NewsEvent[];
  onEventSelect: (eventId: string | null) => void;
}

export default function MapWrapper({ events, onEventSelect }: MapWrapperProps) {
  return <MapClient events={events} onEventSelect={onEventSelect} />;
}
