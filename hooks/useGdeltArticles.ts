/**
 * Hook to fetch real news articles from multi-source RSS feeds.
 * Real headlines, real descriptions, real publish times, real URLs.
 * Polls every 30s until real data arrives, then every 15 min.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { deriveTag } from "@/lib/deriveTags";
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

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  // South Asia
  India: [20.5937, 78.9629],
  Pakistan: [30.3753, 69.3451],
  Bangladesh: [23.685, 90.3563],
  "Sri Lanka": [7.8731, 80.7718],
  Nepal: [28.3949, 84.124],
  Myanmar: [21.9162, 95.9559],
  Bhutan: [27.5142, 90.4336],
  Maldives: [3.2028, 73.2207],
  Afghanistan: [33.9391, 67.71],
  // Middle East & North Africa
  Iran: [32.4279, 53.688],
  Israel: [31.0461, 34.8516],
  Palestine: [31.9522, 35.2332],
  "Saudi Arabia": [23.8859, 45.0792],
  UAE: [23.4241, 53.8478],
  Qatar: [25.3548, 51.1839],
  Yemen: [15.5527, 48.5164],
  Syria: [34.8021, 38.9968],
  Lebanon: [33.8547, 35.8623],
  Iraq: [33.2232, 43.6793],
  Turkey: [38.9637, 35.2433],
  Egypt: [26.8206, 30.8025],
  // Europe & Americas
  Ukraine: [48.3794, 31.1656],
  Russia: [61.524, 105.3188],
  "United Kingdom": [55.3781, -3.436],
  "United States": [37.0902, -95.7129],
  Germany: [51.1657, 10.4515],
  France: [46.2276, 2.2137],
  Switzerland: [46.8182, 8.2275],
  Canada: [56.1304, -106.3468],
  Venezuela: [6.4238, -66.5897],
  // Asia-Pacific & Africa
  China: [35.8617, 104.1954],
  Taiwan: [23.6978, 120.9605],
  Japan: [36.2048, 138.2529],
  "South Korea": [35.9078, 127.7669],
  Thailand: [15.87, 100.9925],
  Sudan: [12.8628, 30.2176],
  Somalia: [5.1521, 46.1996],
};

const COUNTRY_KEYWORD_MAP: Array<{ keywords: string[]; country: string }> = [
  {
    keywords: [
      "iran",
      "tehran",
      "iranian",
      "persian",
      "irgc",
      "khamenei",
      "isfahan",
      "hormuz",
    ],
    country: "Iran",
  },
  {
    keywords: [
      "israel",
      "tel aviv",
      "jerusalem",
      "idf",
      "netanyahu",
      "gaza",
      "haifa",
      "mossad",
      "israeli",
    ],
    country: "Israel",
  },
  {
    keywords: [
      "ukraine",
      "kyiv",
      "kharkiv",
      "odessa",
      "zelensky",
      "donbas",
      "crimea",
      "zaporizhzhia",
      "ukrainian",
    ],
    country: "Ukraine",
  },
  {
    keywords: [
      "russia",
      "moscow",
      "kremlin",
      "putin",
      "st petersburg",
      "russian",
      "kursk",
      "belgorod",
    ],
    country: "Russia",
  },
  {
    keywords: [
      "china",
      "beijing",
      "shanghai",
      "taiwan",
      "taipei",
      "xi jinping",
      "chinese",
    ],
    country: "China",
  },
  { keywords: ["taiwan", "taipei", "tsmc"], country: "Taiwan" },
  {
    keywords: ["yemen", "houthi", "red sea", "sanaa", "aden"],
    country: "Yemen",
  },
  {
    keywords: ["lebanon", "beirut", "hezbollah", "lebanese"],
    country: "Lebanon",
  },
  { keywords: ["syria", "damascus", "aleppo", "syrian"], country: "Syria" },
  { keywords: ["iraq", "baghdad", "erbil", "basra", "iraqi"], country: "Iraq" },
  {
    keywords: ["saudi", "riyadh", "jeddah", "saudi arabia"],
    country: "Saudi Arabia",
  },
  { keywords: ["uae", "dubai", "abu dhabi", "emirates"], country: "UAE" },
  {
    keywords: ["turkey", "ankara", "istanbul", "erdogan", "turkiye"],
    country: "Turkey",
  },
  { keywords: ["egypt", "cairo", "suez"], country: "Egypt" },
  { keywords: ["sudan", "khartoum", "darfur"], country: "Sudan" },
  { keywords: ["somalia", "mogadishu"], country: "Somalia" },
  { keywords: ["japan", "tokyo", "osaka", "japanese"], country: "Japan" },
  {
    keywords: [
      "united states",
      "washington",
      "pentagon",
      "biden",
      "trump",
      "white house",
      "california",
    ],
    country: "United States",
  },
  {
    keywords: ["united kingdom", "london", "british", "britain"],
    country: "United Kingdom",
  },
  { keywords: ["germany", "berlin", "german"], country: "Germany" },
  { keywords: ["france", "paris", "french"], country: "France" },
  {
    keywords: [
      "nepal",
      "kathmandu",
      "pokhara",
      "bhotekoshi",
      "nepali",
      "nepalese",
      "trishuli",
    ],
    country: "Nepal",
  },
  {
    keywords: ["sri lanka", "colombo", "kandy", "galle", "jaffna", "srilankan"],
    country: "Sri Lanka",
  },
  {
    keywords: ["bangladesh", "dhaka", "chittagong", "bangladeshi"],
    country: "Bangladesh",
  },
  {
    keywords: [
      "pakistan",
      "karachi",
      "lahore",
      "islamabad",
      "rawalpindi",
      "peshawar",
      "balochistan",
    ],
    country: "Pakistan",
  },
  {
    keywords: [
      "india",
      "delhi",
      "mumbai",
      "modi",
      "bengaluru",
      "kolkata",
      "chennai",
      "kashmir",
      "indian",
    ],
    country: "India",
  },
  { keywords: ["myanmar", "burma", "yangon", "mandalay"], country: "Myanmar" },
];

function inferCountry(
  title: string,
  description: string,
  fallback: string,
): string {
  const hay = `${title} ${description}`.toLowerCase();
  for (const { keywords, country } of COUNTRY_KEYWORD_MAP) {
    if (keywords.some((kw) => hay.includes(kw))) {
      return country;
    }
  }
  return fallback || "Global";
}

function countryToLatLng(country: string, index: number): [number, number] {
  const base = COUNTRY_CENTROIDS[country] || COUNTRY_CENTROIDS.India;
  // Deterministic jitter per article so markers spread within the country instead of stacking
  const angle = index * 2.39996; // golden angle
  const radius = 0.9 * Math.sqrt((index % 12) + 1); // degrees, spreads ~100km
  const dLat = radius * Math.cos(angle);
  const dLng =
    (radius * Math.sin(angle)) / Math.cos((base[0] * Math.PI) / 180 || 1);
  return [
    Number.parseFloat((base[0] + dLat).toFixed(4)),
    Number.parseFloat((base[1] + dLng).toFixed(4)),
  ];
}

function rssToNewsEvent(art: RssArticle, index: number): NewsEvent {
  const inferred = inferCountry(
    art.title,
    art.description,
    art.sourcecountry || "Global",
  );
  const derived = deriveTag(art.title, art.description, art.domain);
  const [lat, lng] = countryToLatLng(inferred, index);
  return {
    id: `rss-${index}-${art.url.slice(-10)}`,
    title: art.title,
    description: art.description || `Reported by ${art.domain}.`,
    source: art.domain,
    category: derived.bucket,
    tag: derived.tag,
    publishedAt: art.pubDate,
    locationName: inferred,
    lat,
    lng,
    intensity: 0.6,
    url: art.url !== "#" ? art.url : undefined,
    imageUrl: art.imageUrl,
  };
}

interface UseGdeltArticlesResult {
  articles: NewsEvent[];
  isLoading: boolean;
  isError: boolean;
}

export function useGdeltArticles(region = "world"): UseGdeltArticlesResult {
  const [articles, setArticles] = useState<NewsEvent[]>(INITIAL_MOCK);
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

  return { articles, isLoading, isError };
}
