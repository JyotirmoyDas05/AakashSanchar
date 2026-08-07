export type RegionId = "world" | "south-asia";

export interface RegionConfig {
  id: RegionId;
  label: string;
  center: [number, number];
  zoom: number;
  /** [west, south, east, north] bounding box for event filtering; null = global */
  bbox: [number, number, number, number] | null;
  /** Minimum zoom allowed — prevents zooming out to empty areas */
  minZoom: number;
  /** Leaflet maxBounds [[south,west],[north,east]] — locks panning */
  maxBounds: [[number, number], [number, number]];
}

export const REGIONS: Record<RegionId, RegionConfig> = {
  world: {
    id: "world",
    label: "World",
    center: [20, 0],
    zoom: 2,
    bbox: null,
    minZoom: 2,
    maxBounds: [
      [-85, -180],
      [85, 180],
    ],
  },
  "south-asia": {
    id: "south-asia",
    label: "South Asia",
    // Tighter focus: India + immediate neighbours (PK, BD, NP, LK, BT, MM) without
    // the empty Middle-East / S-China-Sea gutters that zoom 4.5 showed.
    center: [23, 82],
    zoom: 5.5,
    // Pakistan (west) → Myanmar (east), Sri Lanka (south) → S. China/Tibet (north); India central
    bbox: [60, 4, 100, 38],
    minZoom: 5,
    // Pan lock mirrors the event bbox with a 2° buffer so Sri Lanka / NE India
    // feel reachable without letting the view drift into the empty gutters.
    maxBounds: [
      [4, 58],
      [39, 102],
    ],
  },
};

export function resolveRegion(id: string | undefined | null): RegionConfig {
  if (id === "south-asia") return REGIONS["south-asia"];
  return REGIONS.world;
}
