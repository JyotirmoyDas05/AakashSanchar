"use client";

import { useCallback, useEffect, useState } from "react";
import type { NewsCategory, TimeRange } from "@/types/news";

const DEFAULT_LAYERS: NewsCategory[] = [
  "news",
  "conflict",
  "disaster",
  "health",
  "space",
];
const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;
const DEFAULT_TIME: TimeRange = "all";

const LAYER_TO_LETTER: Record<NewsCategory, string> = {
  news: "n",
  conflict: "c",
  disaster: "d",
  health: "h",
  space: "s",
};
const LETTER_TO_LAYER: Record<string, NewsCategory> = {
  n: "news",
  c: "conflict",
  d: "disaster",
  h: "health",
  s: "space",
};
const VALID_TIME: TimeRange[] = ["1h", "6h", "24h", "7d", "all"];

interface UrlState {
  center: [number, number];
  zoom: number;
  timeRange: TimeRange;
  activeLayers: NewsCategory[];
  q: string | null;
}

function parseLayers(raw: string | null): NewsCategory[] | null {
  if (!raw) return null;
  const layers = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((p) => LETTER_TO_LAYER[p])
    .filter(Boolean);
  return layers.length ? layers : null;
}

function parseUrl(): Partial<UrlState> {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const out: Partial<UrlState> = {};

  const c = sp.get("c");
  if (c) {
    const [lat, lng] = c.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) out.center = [lat, lng];
  }
  const z = sp.get("z");
  if (z !== null && Number.isFinite(Number(z))) out.zoom = Number(z);

  const t = sp.get("t") as TimeRange | null;
  if (t && VALID_TIME.includes(t)) out.timeRange = t;

  const l = parseLayers(sp.get("l"));
  if (l) out.activeLayers = l;

  const q = sp.get("q");
  if (q !== null) out.q = q.slice(0, 80);

  return out;
}

function buildQuery(state: UrlState): string {
  const params = new URLSearchParams();
  params.set(
    "c",
    `${state.center[0].toFixed(2)},${state.center[1].toFixed(2)}`,
  );
  params.set("z", String(Math.round(state.zoom)));
  params.set("t", state.timeRange);
  const layers = state.activeLayers
    .slice()
    .sort((a, b) => DEFAULT_LAYERS.indexOf(a) - DEFAULT_LAYERS.indexOf(b))
    .map((l) => LAYER_TO_LETTER[l])
    .join(",");
  params.set("l", layers);
  if (state.q) params.set("q", state.q);
  return params.toString();
}

export function useUrlState() {
  const [state, setState] = useState<UrlState>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    timeRange: DEFAULT_TIME,
    activeLayers: DEFAULT_LAYERS,
    q: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Read shared view (if any) once on mount; never strips params.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const parsed = parseUrl();
    setState((prev) => ({
      center: parsed.center ?? prev.center,
      zoom: parsed.zoom ?? prev.zoom,
      timeRange: parsed.timeRange ?? prev.timeRange,
      activeLayers: parsed.activeLayers ?? prev.activeLayers,
      q: parsed.q !== undefined ? parsed.q : prev.q,
    }));
    setIsLoaded(true);
  }, []);

  // Persist compact view state to the URL (debounced, replaceState =
  // no history spam while panning/zooming).
  useEffect(() => {
    if (!isLoaded) return;
    const id = setTimeout(() => {
      if (typeof window === "undefined") return;
      const q = buildQuery(state);
      window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
    }, 400);
    return () => clearTimeout(id);
  }, [state, isLoaded]);

  const setCenter = useCallback((center: [number, number]) => {
    setState((prev) => ({ ...prev, center }));
  }, []);
  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom }));
  }, []);
  const setTimeRange = useCallback((timeRange: TimeRange) => {
    setState((prev) => ({ ...prev, timeRange }));
  }, []);
  const setActiveLayers = useCallback((activeLayers: NewsCategory[]) => {
    setState((prev) => ({ ...prev, activeLayers }));
  }, []);
  const setQ = useCallback((q: string | null) => {
    setState((prev) => ({ ...prev, q: q ? q.slice(0, 80) : null }));
  }, []);

  return {
    ...state,
    isUrlStateLoaded: isLoaded,
    setCenter,
    setZoom,
    setTimeRange,
    setActiveLayers,
    setQ,
  };
}
