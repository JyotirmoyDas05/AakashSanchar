/**
 * Hook to fetch real GDELT events from our API routes.
 * Polls every 5 minutes, falls back to mock data on failure.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { mockNewsEvents } from "@/data/mockNewsEvents";
import { applyCoordinateJitter } from "@/lib/gdelt";
import type { NewsEvent } from "@/types/news";

interface UseGdeltEventsOptions {
  /** Poll interval in ms (default: 5 min) */
  pollInterval?: number;
  /** Use mock data as initial state while loading */
  useMockFallback?: boolean;
}

interface UseGdeltEventsResult {
  events: NewsEvent[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  lastUpdated: string | null;
  isCached: boolean;
  refetch: () => Promise<void>;
}

export function useGdeltEvents(
  options: UseGdeltEventsOptions = {},
): UseGdeltEventsResult {
  const { pollInterval = 5 * 60 * 1000, useMockFallback = true } = options;

  const [events, setEvents] = useState<NewsEvent[]>(
    useMockFallback ? applyCoordinateJitter(mockNewsEvents) : [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const res = await fetch("/api/gdelt/events");
      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();

      if (data.events && data.events.length > 0) {
        setEvents(data.events);
        setLastUpdated(data.cachedAt || new Date().toISOString());
        setIsCached(!!data.cached);
      } else if (useMockFallback) {
        // Keep mock data if API returns empty
        setEvents(mockNewsEvents);
      }
    } catch (err) {
      console.error("[useGdeltEvents] Fetch failed:", err);
      setIsError(true);
      setError(err instanceof Error ? err.message : String(err));
      // Keep existing events (mock or previously fetched)
    } finally {
      setIsLoading(false);
    }
  }, [useMockFallback]);

  // Initial fetch + polling
  useEffect(() => {
    fetchEvents();

    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchEvents, pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchEvents, pollInterval]);

  return {
    events,
    isLoading,
    isError,
    error,
    lastUpdated,
    isCached,
    refetch: fetchEvents,
  };
}
