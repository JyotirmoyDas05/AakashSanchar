/**
 * Hook to fetch real news articles from multi-source RSS feeds.
 * Real headlines, real descriptions, real publish times, real URLs.
 * Polls every 30s until real data arrives, then every 15 min.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { deriveTag } from "@/lib/deriveTags";
// Type-only: erased at compile time, so nothing server-side is bundled.
import type { LocationDigest } from "@/lib/locationDigest";
import type { NewsCategory, NewsEvent } from "@/types/news";

interface RssArticle {
  url: string;
  title: string;
  description: string;
  pubDate: string; // ISO 8601
  domain: string;
  language: string;
  sourcecountry: string;
  imageUrl?: string;
  /** Resolved server-side by lib/geocode.ts; absent when no place was found. */
  lat?: number;
  lng?: number;
  locationName?: string;
}

// Shown immediately on page load — replaced once RSS feeds respond
const INITIAL_MOCK: NewsEvent[] = [
  {
    id: "init-1",
    title: "AAKASH Intelligence Grid Synchronising Live Feeds…",
    description:
      "Connecting to global news wire. Real articles loading shortly.",
    source: "system",
    category: "news",
    tag: "General",
    publishedAt: new Date().toISOString(),
    locationName: "SYSTEM STATUS",
    lat: 0,
    lng: 0,
    intensity: 1,
  },
  {
    id: "init-2",
    title: "Scanning Global RSS Horizon — Incoming Intel Streams",
    description: "Parsing BBC, Reuters, Al Jazeera, Guardian and more.",
    source: "system",
    category: "conflict",
    tag: "Armed Clash",
    publishedAt: new Date(Date.now() - 60_000).toISOString(),
    locationName: "SYSTEM STATUS",
    lat: 0,
    lng: 0,
    intensity: 1,
  },
  {
    id: "init-3",
    title: "Feed Aggregation Active — Awaiting Article Data",
    description:
      "Fetching real-time headlines from 8 major news sources worldwide.",
    source: "system",
    category: "space",
    tag: "Space",
    publishedAt: new Date(Date.now() - 120_000).toISOString(),
    locationName: "SYSTEM STATUS",
    lat: 0,
    lng: 0,
    intensity: 1,
  },
];

function _refineCategory(title: string, domain: string): NewsCategory {
  const t = `${title} ${domain}`.toLowerCase();
  if (
    t.includes("earthquake") ||
    t.includes("tsunami") ||
    t.includes("hurricane") ||
    t.includes("tornado") ||
    t.includes("flood") ||
    t.includes("wildfire") ||
    t.includes("volcano") ||
    t.includes("cyclone") ||
    t.includes("landslide")
  )
    return "disaster";
  if (
    t.includes("outbreak") ||
    t.includes("pandemic") ||
    t.includes("epidemic") ||
    t.includes("virus") ||
    t.includes("ebola") ||
    t.includes("cholera") ||
    t.includes("influenza") ||
    t.includes("disease") ||
    t.includes("who warns")
  )
    return "health";
  if (
    t.includes("satellite") ||
    t.includes("space") ||
    t.includes("nasa") ||
    t.includes("orbit") ||
    t.includes("rocket") ||
    t.includes("solar flare") ||
    t.includes("asteroid")
  )
    return "space";
  if (
    t.includes("war") ||
    t.includes("attack") ||
    t.includes("bombing") ||
    t.includes("military") ||
    t.includes("airstrike") ||
    t.includes("shelling") ||
    t.includes("troops") ||
    t.includes("missile") ||
    t.includes("combat") ||
    t.includes("clash") ||
    t.includes("conflict") ||
    t.includes("killed") ||
    t.includes("explosion") ||
    t.includes("shooting") ||
    t.includes("strike")
  )
    return "conflict";
  return "news";
}

// Coordinates now arrive resolved from /api/gdelt/articles (see lib/geocode.ts).
// The old country-centroid table plus golden-angle jitter that used to live
// here fabricated positions: it threw Bangladeshi wires across the border into
// Assam and dropped every unrecognised country onto India's centroid.

function rssToNewsEvent(art: RssArticle, index: number): NewsEvent {
  const derived = deriveTag(art.title, art.description, art.domain);
  // NaN when the server could not resolve a place. Callers that draw markers
  // already gate on Number.isFinite, so an unplaceable article stays in the
  // wire feed and never appears on the map at a made-up location.
  const lat = art.lat ?? Number.NaN;
  const lng = art.lng ?? Number.NaN;
  return {
    id: `rss-${index}-${art.url.slice(-10)}`,
    title: art.title,
    description: art.description || `Reported by ${art.domain}.`,
    source: art.domain,
    category: derived.bucket,
    tag: derived.tag,
    publishedAt: art.pubDate,
    locationName: art.locationName ?? "Global",
    lat,
    lng,
    intensity: 0.6,
    url: art.url !== "#" ? art.url : undefined,
    imageUrl: art.imageUrl,
  };
}

interface UseGdeltArticlesResult {
  articles: NewsEvent[];
  /** Precomputed per-location brief + analysis, keyed by resolved place. */
  digests: Map<string, LocationDigest>;
  isLoading: boolean;
  isError: boolean;
}

export function useGdeltArticles(region = "world"): UseGdeltArticlesResult {
  const [articles, setArticles] = useState<NewsEvent[]>(INITIAL_MOCK);
  const [digests, setDigests] = useState<Map<string, LocationDigest>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const hasRealData = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const res = await fetch(
        `/api/gdelt/articles?region=${encodeURIComponent(region)}`,
      );
      if (!res.ok) throw new Error(`Articles API returned ${res.status}`);
      const data = await res.json();
      const rawArticles: RssArticle[] = data.articles || [];
      const rawDigests: LocationDigest[] = data.locations || [];
      if (rawDigests.length) {
        setDigests(new Map(rawDigests.map((d) => [d.locationName, d])));
      }

      const seen = new Set<string>();
      const parsed = rawArticles
        .filter((a) => a.title && a.url)
        .filter((a) => {
          const key = a.title.toLowerCase().slice(0, 60);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(rssToNewsEvent);

      // Only update state with real articles (have a real URL, not "#")
      const isReal = parsed.some((e) => e.url);
      if (isReal && parsed.length > 0) {
        setArticles(parsed);
        if (!hasRealData.current) {
          hasRealData.current = true;
          // Slow down polling now that we have real data
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = setInterval(fetchArticles, 15 * 60 * 1000);
        }
      }
      // If still mock from server — keep showing INITIAL_MOCK (better UX)
    } catch (err) {
      console.error("[useGdeltArticles]", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [region]);

  useEffect(() => {
    // Reset so the faster poll resumes until real data for this region arrives
    hasRealData.current = false;
    fetchArticles();
    // Poll every 30s until real data arrives
    intervalRef.current = setInterval(fetchArticles, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchArticles]);

  return { articles, digests, isLoading, isError };
}
