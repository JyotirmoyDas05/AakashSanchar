import { calculateCoreSpatialCluster } from "@/lib/search";
import type { NewsEvent } from "@/types/news";

export interface PlaceParts {
  city: string;
  admin1: string;
  country: string;
}

/**
 * Split a resolved location name into its administrative levels.
 * lib/geocode.ts emits "City, Admin1, Country" / "Admin1, Country" / "Country",
 * so a two-part name is a state, not a city.
 */
export function placeParts(e: NewsEvent): PlaceParts {
  const p = e.locationName
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (p.length >= 3)
    return { city: p[0], admin1: p[p.length - 2], country: p[p.length - 1] };
  if (p.length === 2) return { city: "", admin1: p[0], country: p[1] };
  return { city: "", admin1: "", country: p[0] ?? "" };
}

function countryOf(e: NewsEvent): string {
  return placeParts(e).country.toLowerCase();
}

function admin1Of(e: NewsEvent): string {
  return placeParts(e).admin1.toLowerCase();
}

function modal(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = "";
  let max = 0;
  for (const [v, n] of counts) {
    if (n > max) {
      max = n;
      best = v;
    }
  }
  return best;
}

/**
 * The most specific place every event in the set agrees on: a shared city if
 * there is one, else a shared state, else the dominant country. Naming a
 * Guwahati cluster "INDIA" was technically true and useless.
 */
export function mostSpecificPlaceName(events: NewsEvent[]): string {
  if (!events.length) return "REGION";
  const parts = events.map(placeParts);
  const shared = (pick: (p: PlaceParts) => string): string => {
    const set = new Set(parts.map(pick).filter(Boolean));
    return set.size === 1 ? [...set][0] : "";
  };
  return (
    shared((p) => p.city) ||
    shared((p) => p.admin1) ||
    modal(parts.map((p) => p.country)) ||
    "REGION"
  );
}

export function aggregateRegionalEvents(
  primaryEvents: NewsEvent[],
  allEvents: NewsEvent[],
  searchQuery?: string | null,
): NewsEvent[] {
  if (!primaryEvents.length) return [];
  // If search query is active, search filter is already applied
  if (searchQuery) return primaryEvents;

  // Scope to the cluster's own state where it has one, falling back to country
  // for country-precision dispatches. A country scope plus a 5-degree box turned
  // a Guwahati cluster into 508 dispatches spanning half of northern India.
  const targetAdmin1 = modal(primaryEvents.map(admin1Of));
  const targetCountry = modal(primaryEvents.map(countryOf));
  const inScope = targetAdmin1
    ? (e: NewsEvent) => admin1Of(e) === targetAdmin1
    : (e: NewsEvent) => countryOf(e) === targetCountry;

  const { centroid } = calculateCoreSpatialCluster(primaryEvents);
  const [cLat, cLng] = centroid ?? [
    primaryEvents.reduce((s, e) => s + e.lat, 0) / primaryEvents.length,
    primaryEvents.reduce((s, e) => s + e.lng, 0) / primaryEvents.length,
  ];

  const seen = new Set(primaryEvents.map((e) => e.id));
  const aggregated = [...primaryEvents];

  for (const e of allEvents) {
    if (seen.has(e.id)) continue;
    // Never aggregate across a border or out of the state. A 5-degree box around
    // Kathmandu covers the whole Indo-Gangetic plain, and India outnumbers Nepal
    // ~2:1 in the feed, so a Nepali cluster used to come back labelled INDIA.
    if (!targetCountry || !inScope(e)) continue;

    // Spatial proximity (~500km / ~5.0 degrees)
    const dLat = Math.abs(e.lat - cLat);
    const dLng = Math.abs(e.lng - cLng);
    if (dLat <= 5.0 && dLng <= 6.5) {
      seen.add(e.id);
      aggregated.push(e);
    }
  }

  aggregated.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return aggregated;
}
