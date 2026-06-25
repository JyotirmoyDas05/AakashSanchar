import type { NewsEvent } from "@/types/news";

export type HeatPoint = [number, number, number];

export function toHeatPoints(events: NewsEvent[]): HeatPoint[] {
  return events.map((e) => [e.lat, e.lng, e.intensity]);
}
