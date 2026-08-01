/**
 * Hook to fetch real news articles from multi-source RSS feeds.
 * Real headlines, real descriptions, real publish times, real URLs.
 * Polls every 30s until real data arrives, then every 15 min.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsCategory, NewsEvent } from "@/types/news";

interface RssArticle {
  url: string;
  title: string;
  description: string;
  pubDate: string; // ISO 8601
  domain: string;
  language: string;
  sourcecountry: string;
}

// Shown immediately on page load — replaced once RSS feeds respond
const INITIAL_MOCK: NewsEvent[] = [
  {
    id: "init-1",
    title: "Aegis Intelligence Grid Synchronising Live Feeds…",
    description:
      "Connecting to global news wire. Real articles loading shortly.",
    source: "system",
    category: "news",
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
    publishedAt: new Date(Date.now() - 120_000).toISOString(),
    locationName: "SYSTEM STATUS",
    lat: 0,
    lng: 0,
    intensity: 1,
  },
];

function refineCategory(title: string, domain: string): NewsCategory {
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

function rssToNewsEvent(art: RssArticle, index: number): NewsEvent {
  const category = refineCategory(art.title, art.domain);
  return {
    id: `rss-${index}-${art.url.slice(-10)}`,
    title: art.title,
    description: art.description || `Reported by ${art.domain}.`,
    source: art.domain,
    category,
    publishedAt: art.pubDate,
    locationName: art.sourcecountry || "Global",
    lat: 0,
    lng: 0,
    intensity: 0.6,
    url: art.url !== "#" ? art.url : undefined,
  };
}

interface UseGdeltArticlesResult {
  articles: NewsEvent[];
  isLoading: boolean;
  isError: boolean;
}

export function useGdeltArticles(): UseGdeltArticlesResult {
  const [articles, setArticles] = useState<NewsEvent[]>(INITIAL_MOCK);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const hasRealData = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const res = await fetch("/api/gdelt/articles");
      if (!res.ok) throw new Error(`Articles API returned ${res.status}`);
      const data = await res.json();
      const rawArticles: RssArticle[] = data.articles || [];

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
  }, []);

  useEffect(() => {
    fetchArticles();
    // Poll every 30s until real data arrives
    intervalRef.current = setInterval(fetchArticles, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchArticles]);

  return { articles, isLoading, isError };
}
