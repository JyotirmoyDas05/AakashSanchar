/**
 * News articles route — powered by RSS feeds from major outlets.
 * No rate limits, real article titles, real descriptions, real publish times.
 * Caches for 15 min. Always returns 200 with mock fallback.
 */

import { type NextRequest, NextResponse } from "next/server";

export interface RssArticle {
  url: string;
  title: string;
  description: string;
  pubDate: string; // ISO 8601
  domain: string;
  language: string;
  sourcecountry: string;
}

interface CacheEntry {
  articles: RssArticle[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;
let fetchInProgress = false;
let lastAttempt = 0;
const MIN_RETRY_MS = 60_000; // 1 min between full re-fetches

//  RSS feed sources
const RSS_FEEDS: { url: string; domain: string; country: string }[] = [
  {
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    domain: "bbc.com",
    country: "United Kingdom",
  },
  {
    url: "https://feeds.reuters.com/reuters/topNews",
    domain: "reuters.com",
    country: "United States",
  },
  {
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    domain: "aljazeera.com",
    country: "Qatar",
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    domain: "nytimes.com",
    country: "United States",
  },
  {
    url: "https://feeds.npr.org/1001/rss.xml",
    domain: "npr.org",
    country: "United States",
  },
  {
    url: "https://www.theguardian.com/world/rss",
    domain: "theguardian.com",
    country: "United Kingdom",
  },
  {
    url: "https://rss.dw.com/rss/en-world",
    domain: "dw.com",
    country: "Germany",
  },
  {
    url: "https://www.france24.com/en/rss",
    domain: "france24.com",
    country: "France",
  },
];

// ── Minimal RSS/Atom XML parser ───────────────────────────────────────────────
function extractText(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(re);
  if (!match) return "";
  let content = match[1].trim();
  // Strip CDATA wrapper if present
  if (content.startsWith("<![CDATA[")) {
    content = content.substring(9);
  }
  if (content.endsWith("]]>")) {
    content = content.substring(0, content.length - 3);
  }
  return content.trim();
}

function parseRssItems(
  xml: string,
  domain: string,
  country: string,
): RssArticle[] {
  const items: RssArticle[] = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match = itemRe.exec(xml);

  while (match !== null) {
    const block = match[1];

    // Clean up title
    const rawTitle = extractText(block, "title");
    const title = rawTitle
      .replace(/&#(\d+);/g, (_, dec) =>
        String.fromCharCode(Number.parseInt(dec, 10)),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      )
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\u00e2\u0080\u0099/g, "'")
      .replace(/\u00e2\u0080\u009c/g, '"')
      .replace(/\u00e2\u0080\u009d/g, '"')
      // biome-ignore lint/suspicious/noControlCharactersInRegex: we want to clean ASCII control characters and non-printable multi-byte sequences
      .replace(/[^\x00-\x7F\u00C0-\u024F\u0400-\u04FF]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const link =
      extractText(block, "link") ||
      (block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? "");

    const rawDesc =
      extractText(block, "content:encoded") ||
      extractText(block, "content") ||
      extractText(block, "description");

    // Decode HTML entities FIRST (both decimal and hex numeric entities)
    let decodedDesc = rawDesc
      .replace(/&#(\d+);/g, (_, dec) =>
        String.fromCharCode(Number.parseInt(dec, 10)),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      )
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ");

    // Strip HTML tags
    decodedDesc = decodedDesc.replace(/<[^>]+>/g, " ");

    const desc = decodedDesc
      .replace(/Continue reading\.\.\./gi, "")
      .replace(/\s+/g, " ") // collapse whitespace
      .trim()
      .slice(0, 1000); // cap at 1000 chars

    const pubDateRaw =
      extractText(block, "pubDate") ||
      extractText(block, "published") ||
      extractText(block, "updated");

    if (title && link) {
      let pubDate: string;
      try {
        pubDate = new Date(pubDateRaw || Date.now()).toISOString();
      } catch {
        pubDate = new Date().toISOString();
      }

      items.push({
        url: link,
        title,
        description: desc || `Reported by ${domain}.`,
        pubDate,
        domain,
        language: "English",
        sourcecountry: country,
      });
    }

    match = itemRe.exec(xml);
  }

  return items;
}

async function fetchFeed(
  feedUrl: string,
  domain: string,
  country: string,
): Promise<RssArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AegisSentinel/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, domain, country);
  } catch {
    return [];
  }
}

async function fetchAllFeeds(): Promise<RssArticle[]> {
  const results = await Promise.all(
    RSS_FEEDS.map((f) => fetchFeed(f.url, f.domain, f.country)),
  );

  const seen = new Set<string>();
  const all: RssArticle[] = [];

  for (const batch of results) {
    for (const art of batch) {
      const key = art.title.toLowerCase().slice(0, 60);
      if (!seen.has(key)) {
        seen.add(key);
        all.push(art);
      }
    }
  }

  // Sort newest first
  all.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  return all;
}

// ── Fallback mock articles ────────────────────────────────────────────────────
const MOCK_ARTICLES: RssArticle[] = [
  {
    url: "#",
    title: "Ongoing Geopolitical Tensions Reported Across Multiple Regions",
    description:
      "Multiple international observers are monitoring escalating tensions in several contested regions as diplomatic efforts continue.",
    pubDate: new Date(Date.now() - 3_600_000).toISOString(),
    domain: "reuters.com",
    language: "English",
    sourcecountry: "United States",
  },
  {
    url: "#",
    title: "International Humanitarian Response Mobilized for Disaster Zone",
    description:
      "Aid organizations have mobilized emergency relief teams following reports of widespread civilian displacement and infrastructure damage.",
    pubDate: new Date(Date.now() - 7_200_000).toISOString(),
    domain: "apnews.com",
    language: "English",
    sourcecountry: "United States",
  },
  {
    url: "#",
    title:
      "UN Security Council Convenes Emergency Session on Regional Conflict",
    description:
      "Council members are urgently debating ceasefire mechanisms and the deployment of international peacekeeping forces.",
    pubDate: new Date(Date.now() - 10_800_000).toISOString(),
    domain: "bbc.com",
    language: "English",
    sourcecountry: "United Kingdom",
  },
  {
    url: "#",
    title: "WHO Issues Health Advisory Following Disease Outbreak Cluster",
    description:
      "Health authorities have identified a cluster of cases requiring immediate containment protocols and public health surveillance.",
    pubDate: new Date(Date.now() - 14_400_000).toISOString(),
    domain: "who.int",
    language: "English",
    sourcecountry: "Switzerland",
  },
  {
    url: "#",
    title: "Global Markets React to Escalating Trade and Sanctions Dispute",
    description:
      "Equity markets fell sharply as investors weigh the impact of new export restrictions affecting key industrial supply chains.",
    pubDate: new Date(Date.now() - 18_000_000).toISOString(),
    domain: "bloomberg.com",
    language: "English",
    sourcecountry: "United States",
  },
];

// Background refresh
async function triggerBackgroundRefresh(cacheKey: string) {
  if (fetchInProgress) return;
  fetchInProgress = true;
  lastAttempt = Date.now();
  try {
    const articles = await fetchAllFeeds();
    if (articles.length > 0) {
      cache.set(cacheKey, { articles, timestamp: Date.now() });
      console.log(`[RSS Articles] Cached ${articles.length} articles`);
    } else {
      console.warn("[RSS Articles] All feeds returned empty, retrying in 60s");
      setTimeout(() => {
        fetchInProgress = false;
        triggerBackgroundRefresh(cacheKey).catch(() => {});
      }, MIN_RETRY_MS);
      return;
    }
  } catch (err) {
    console.error("[RSS Articles] Error:", err);
  } finally {
    fetchInProgress = false;
  }
}

// Route handler
export async function GET(_request: NextRequest) {
  const cacheKey = "rss:all";
  const cached = cache.get(cacheKey);

  // Fresh cache → return immediately
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      articles: cached.articles,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString(),
      count: cached.articles.length,
    });
  }

  // Trigger background refresh if not recently attempted
  if (!fetchInProgress && Date.now() - lastAttempt > MIN_RETRY_MS) {
    triggerBackgroundRefresh(cacheKey).catch(() => {});
  }

  // Return stale cache or mock — always 200
  const fallback = cached?.articles ?? MOCK_ARTICLES;
  return NextResponse.json({
    articles: fallback,
    cached: true,
    stale: true,
    cachedAt: cached
      ? new Date(cached.timestamp).toISOString()
      : new Date().toISOString(),
    count: fallback.length,
  });
}
