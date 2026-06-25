"use client";

import { useCallback, useEffect, useState } from "react";
import type { NewsCategory, TimeRange } from "@/types/news";

const DEFAULT_LAYERS: NewsCategory[] = [
  "breaking",
  "protests",
  "disasters",
  "politics",
  "economy",
  "tech",
];
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India center
const DEFAULT_ZOOM = 5;
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

  // Initialize state from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const latParam = params.get("lat");
    const lngParam = params.get("lng");
    const zoomParam = params.get("zoom");
    const timeParam = params.get("time");
    const layersParam = params.get("layers");

    const center: [number, number] =
      latParam && lngParam
        ? [parseFloat(latParam), parseFloat(lngParam)]
        : DEFAULT_CENTER;
    const zoom = zoomParam ? parseInt(zoomParam, 10) : DEFAULT_ZOOM;
    const timeRange = (timeParam as TimeRange) || DEFAULT_TIME;

    let activeLayers = DEFAULT_LAYERS;
    if (layersParam) {
      const parsed = layersParam
        .split(",")
        .filter((l) =>
          [
            "breaking",
            "protests",
            "disasters",
            "politics",
            "economy",
            "tech",
          ].includes(l),
        ) as NewsCategory[];
      if (parsed.length > 0) {
        activeLayers = parsed;
      }
    }

    setState({
      center,
      zoom,
      timeRange,
      activeLayers,
    });
    setIsLoaded(true);
  }, []);

  // Update URL parameters when state changes
  const updateUrl = useCallback((updates: Partial<UrlState>) => {
    if (typeof window === "undefined") return;

    setState((prev) => {
      const next = { ...prev, ...updates };

      const params = new URLSearchParams();
      params.set("lat", next.center[0].toFixed(5));
      params.set("lng", next.center[1].toFixed(5));
      params.set("zoom", next.zoom.toString());
      params.set("time", next.timeRange);
      params.set("layers", next.activeLayers.join(","));

      const newRelativePathQuery = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newRelativePathQuery);

      return next;
    });
  }, []);

  return {
    ...state,
    isUrlStateLoaded: isLoaded,
    setCenter: useCallback(
      (center: [number, number]) => updateUrl({ center }),
      [updateUrl],
    ),
    setZoom: useCallback((zoom: number) => updateUrl({ zoom }), [updateUrl]),
    setTimeRange: useCallback(
      (timeRange: TimeRange) => updateUrl({ timeRange }),
      [updateUrl],
    ),
    setActiveLayers: useCallback(
      (activeLayers: NewsCategory[]) => updateUrl({ activeLayers }),
      [updateUrl],
    ),
  };
}
