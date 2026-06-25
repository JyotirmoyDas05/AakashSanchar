import type { NewsEvent } from "@/types/news";

const THRESHOLD_SQ = 0.5 * 0.5;

function distSq(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return dLat * dLat + dLng * dLng;
}

export function findNearestEvent(
  events: NewsEvent[],
  lat: number,
  lng: number,
): NewsEvent | null {
  let best: NewsEvent | null = null;
  let bestDist = Infinity;

  for (const event of events) {
    const d = distSq(lat, lng, event.lat, event.lng);
    if (d < bestDist) {
      bestDist = d;
      best = event;
    }
  }

  if (best !== null && bestDist <= THRESHOLD_SQ) {
    return best;
  }

  return null;
}
