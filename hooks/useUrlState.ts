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
const DEFAULT_CENTER: [number, number] = [20, 0]; // global center
const DEFAULT_ZOOM = 2;
const DEFAULT_TIME: TimeRange = "all";

interface UrlState {
  center: [number, number];
  zoom: number;
  timeRange: TimeRange;
  activeLayers: NewsCategory[];
}

export function useUrlState() {
  const [state, setState] = useState<UrlState>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    timeRange: DEFAULT_TIME,
    activeLayers: DEFAULT_LAYERS,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // cleans url
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    setIsLoaded(true);
  }, []);

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

  return {
    ...state,
    isUrlStateLoaded: isLoaded,
    setCenter,
    setZoom,
    setTimeRange,
    setActiveLayers,
  };
}
