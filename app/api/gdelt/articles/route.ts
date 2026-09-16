/**
 * News articles route — powered by RSS feeds from major outlets.
 * No rate limits, real article titles, real descriptions, real publish times.
 * Caches for 15 min. Always returns 200 with mock fallback.
 */

import { type NextRequest, NextResponse } from "next/server";
import { resolvePlace } from "@/lib/geocode";
import {
  buildLocationDigests,
  type LocationDigest,
} from "@/lib/locationDigest";

export interface RssArticle {
  url: string;
  title: string;
  description: string;
  pubDate: string; // ISO 8601
  domain: string;
  language: string;
  sourcecountry: string;
  imageUrl?: string;
  /**
   * Resolved server-side from the article text against the GeoNames gazetteer.
   * Absent when no place could be resolved — the client must then omit the
   * marker rather than invent one.
   */
  lat?: number;
  lng?: number;
  locationName?: string;
}

interface CacheEntry {
  articles: RssArticle[];
  /** Per-location briefs, precomputed with the refresh rather than per request. */
  digests: LocationDigest[];
  timestamp: number;
}

// Feeds + geocoding take ~10-20s on a cold instance; the platform default of
// 10s would kill it halfway.
export const maxDuration = 60;

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;
let lastAttempt = 0;
const MIN_RETRY_MS = 60_000; // 1 min between full re-fetches

//  RSS feed sources per region
interface RssFeed {
  url: string;
  domain: string;
  country: string;
  /** Feed's primary language (defaults to English) */
  lang?: string;
}

const WORLD_FEEDS: RssFeed[] = [
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

// South Asia focus: Indian outlets as epicentre + geopolitical neighbours,
// with BBC World / Reuters retained for global context. Native-language
// outlets (Hindi, Bangla, Tamil, Urdu, Nepali...) are included intentionally —
// the parser preserves Indic/Arabic Unicode scripts.
const SOUTH_ASIA_FEEDS: RssFeed[] = [
  // ── India (English) ──
  {
    url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    domain: "timesofindia.indiatimes.com",
    country: "India",
  },
  {
    url: "https://www.thehindu.com/news/national/feeder/default.rss",
    domain: "thehindu.com",
    country: "India",
  },
  {
    url: "https://feeds.feedburner.com/ndtvnews-india-news",
    domain: "ndtv.com",
    country: "India",
  },
  {
    url: "https://www.hindustantimes.com/feeds/rss/topnews/rss.xml",
    domain: "hindustantimes.com",
    country: "India",
  },
  {
    url: "https://indianexpress.com/feed/",
    domain: "indianexpress.com",
    country: "India",
  },
  {
    url: "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
    domain: "economictimes.indiatimes.com",
    country: "India",
  },
  {
    url: "https://www.indiatoday.in/rss/1206578",
    domain: "indiatoday.in",
    country: "India",
  },
  {
    url: "https://www.livemint.com/rss/news",
    domain: "livemint.com",
    country: "India",
  },
  {
    url: "https://www.moneycontrol.com/rss/latestnews.xml",
    domain: "moneycontrol.com",
    country: "India",
  },
  {
    url: "https://www.business-standard.com/rss/home_page_top_stories.rss",
    domain: "business-standard.com",
    country: "India",
  },
  {
    url: "https://www.deccanchronicle.com/feed",
    domain: "deccanchronicle.com",
    country: "India",
  },
  // ── India (native languages) ──
  {
    url: "https://feeds.bbci.co.uk/hindi/rss.xml",
    domain: "bbc.com/hindi",
    country: "India",
    lang: "Hindi",
  },
  {
    url: "https://feeds.bbci.co.uk/tamil/rss.xml",
    domain: "bbc.com/tamil",
    country: "India",
    lang: "Tamil",
  },
  {
    url: "https://feeds.bbci.co.uk/telugu/rss.xml",
    domain: "bbc.com/telugu",
    country: "India",
    lang: "Telugu",
  },
  {
    url: "https://feeds.bbci.co.uk/marathi/rss.xml",
    domain: "bbc.com/marathi",
    country: "India",
    lang: "Marathi",
  },
  {
    url: "https://feeds.bbci.co.uk/gujarati/rss.xml",
    domain: "bbc.com/gujarati",
    country: "India",
    lang: "Gujarati",
  },
  {
    url: "https://feeds.bbci.co.uk/punjabi/rss.xml",
    domain: "bbc.com/punjabi",
    country: "India",
    lang: "Punjabi",
  },
  // ── Pakistan ──
  {
    url: "https://www.dawn.com/feeds/home",
    domain: "dawn.com",
    country: "Pakistan",
  },
  {
    url: "https://feeds.bbci.co.uk/urdu/rss.xml",
    domain: "bbc.com/urdu",
    country: "Pakistan",
    lang: "Urdu",
  },
  // ── Bangladesh ──
  {
    url: "https://www.thedailystar.net/frontpage/rss.xml",
    domain: "thedailystar.net",
    country: "Bangladesh",
  },
  {
    url: "https://www.prothomalo.com/feed/",
    domain: "prothomalo.com",
    country: "Bangladesh",
    lang: "Bengali",
  },
  {
    url: "https://en.prothomalo.com/feed/",
    domain: "en.prothomalo.com",
    country: "Bangladesh",
  },
  {
    url: "https://feeds.bbci.co.uk/bengali/rss.xml",
    domain: "bbc.com/bangla",
    country: "Bangladesh",
    lang: "Bengali",
  },
  // ── Sri Lanka ──
  {
    url: "https://www.dailymirror.lk/breaking-news/108/rss",
    domain: "dailymirror.lk",
    country: "Sri Lanka",
  },
  {
    url: "http://www.adaderana.lk/rss.php",
    domain: "adaderana.lk",
    country: "Sri Lanka",
  },
  {
    url: "https://feeds.bbci.co.uk/sinhala/rss.xml",
    domain: "bbc.com/sinhala",
    country: "Sri Lanka",
    lang: "Sinhala",
  },
  // ── Nepal ──
  {
    url: "https://kathmandupost.com/rss",
    domain: "kathmandupost.com",
    country: "Nepal",
  },
  {
    url: "https://feeds.bbci.co.uk/nepali/rss.xml",
    domain: "bbc.com/nepali",
    country: "Nepal",
    lang: "Nepali",
  },
  // ── Myanmar ──
  {
    url: "https://www.irrawaddy.com/feed",
    domain: "irrawaddy.com",
    country: "Myanmar",
  },
  {
    url: "https://english.dvb.no/feed/",
    domain: "english.dvb.no",
    country: "Myanmar",
  },
  {
    url: "https://feeds.bbci.co.uk/burmese/rss.xml",
    domain: "bbc.com/burmese",
    country: "Myanmar",
    lang: "Burmese",
  },
  // ── Indian states & union territories ──
  // Regional outlets so state-level news actually enters the pipeline; the
  // gazetteer then resolves where each story happened. Every URL below was
  // probed and returned a live feed with items.
  ...(
    [
      // North East
      ["eastmojo.com", "https://www.eastmojo.com/feed/"],
      ["nenow.in", "https://nenow.in/feed"],
      ["northeasttoday.in", "https://www.northeasttoday.in/feed/"],
      ["assamtribune.com", "https://assamtribune.com/feed"],
      ["sentinelassam.com", "https://www.sentinelassam.com/feed"],
      ["theshillongtimes.com", "https://theshillongtimes.com/feed/"],
      ["arunachaltimes.in", "https://arunachaltimes.in/index.php/feed/"],
      ["ifp.co.in", "https://www.ifp.co.in/rss"],
      ["nagalandpost.com", "https://nagalandpost.com/feed/"],
      ["morungexpress.com", "https://morungexpress.com/feed"],
      ["thesikkimchronicle.com", "https://thesikkimchronicle.com/feed/"],
      ["voiceofsikkim.com", "https://voiceofsikkim.com/feed/"],
      // South
      [
        "thehindu.com/tamil-nadu",
        "https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss",
      ],
      [
        "thehindu.com/kerala",
        "https://www.thehindu.com/news/national/kerala/feeder/default.rss",
      ],
      [
        "thehindu.com/karnataka",
        "https://www.thehindu.com/news/national/karnataka/feeder/default.rss",
      ],
      [
        "thehindu.com/andhra-pradesh",
        "https://www.thehindu.com/news/national/andhra-pradesh/feeder/default.rss",
      ],
      [
        "thehindu.com/telangana",
        "https://www.thehindu.com/news/national/telangana/feeder/default.rss",
      ],
      [
        "thehindu.com/puducherry",
        "https://www.thehindu.com/news/cities/puducherry/feeder/default.rss",
      ],
      ["onmanorama.com", "https://www.onmanorama.com/kerala.feeds.onmrss.xml"],
      // North & West
      [
        "thehindu.com/delhi",
        "https://www.thehindu.com/news/cities/Delhi/feeder/default.rss",
      ],
      [
        "thehindu.com/mumbai",
        "https://www.thehindu.com/news/cities/mumbai/feeder/default.rss",
      ],
      [
        "hindustantimes.com/pune",
        "https://www.hindustantimes.com/feeds/rss/cities/pune-news/rssfeed.xml",
      ],
      [
        "hindustantimes.com/chandigarh",
        "https://www.hindustantimes.com/feeds/rss/cities/chandigarh-news/rssfeed.xml",
      ],
      ["freepressjournal.in", "https://www.freepressjournal.in/stories.rss"],
      ["greaterkashmir.com", "https://www.greaterkashmir.com/feed"],
      ["risingkashmir.com", "https://risingkashmir.com/rss"],
      ["garhwalpost.in", "https://garhwalpost.in/feed/"],
      ["himachalscape.com", "https://himachalscape.com/feed/"],
      // East & Central
      ["millenniumpost.in", "https://www.millenniumpost.in/feed"],
      ["odishatv.in", "https://odishatv.in/feed"],
      ["odishabytes.com", "https://odishabytes.com/feed/"],
      ["prabhatkhabar.com", "https://www.prabhatkhabar.com/feed"],
      ["avenuemail.in", "https://avenuemail.in/feed/"],
      ["andamansheekha.com", "https://andamansheekha.com/feed/"],
      // Thinly-covered states — added so every state/UT clears the per-region floor
      ["himachalabhiabhi.com", "https://himachalabhiabhi.com/feed/"],
      ["jharkhandmirror.net", "https://jharkhandmirror.net/feed/"],
      ["haribhoomi.com", "https://www.haribhoomi.com/feed"],
      // National aggregator, wide state coverage
      ["news18.com", "https://www.news18.com/commonfeeds/v1/eng/rss/india.xml"],
    ] as const
  ).map(([domain, url]) => ({ domain, url, country: "India" })),
  // Hindi-language state desks
  {
    url: "https://www.amarujala.com/rss/uttar-pradesh.xml",
    domain: "amarujala.com",
    country: "India",
    lang: "Hindi",
  },
  {
    url: "https://www.bhaskar.com/rss-v1--category-1731.xml",
    domain: "bhaskar.com",
    country: "India",
    lang: "Hindi",
  },

  // ── India's neighbours — these had little or no coverage in the feed set ──
  {
    url: "https://bhutanlive.com/feed/",
    domain: "bhutanlive.com",
    country: "Bhutan",
  },
  {
    url: "https://www.khaama.com/feed/",
    domain: "khaama.com",
    country: "Afghanistan",
  },
  {
    url: "https://www.ariananews.af/feed/",
    domain: "ariananews.af",
    country: "Afghanistan",
  },
  {
    url: "https://www.newswire.lk/feed/",
    domain: "newswire.lk",
    country: "Sri Lanka",
  },
  {
    url: "https://myanmar-now.org/en/feed/",
    domain: "myanmar-now.org",
    country: "Myanmar",
  },

  // ── Global context wires ──
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
];

function feedsForRegion(region: string | null) {
  return region === "south-asia" ? SOUTH_ASIA_FEEDS : WORLD_FEEDS;
}

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
  lang?: string,
): RssArticle[] {
  const items: RssArticle[] = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match = itemRe.exec(xml);
  let itemIndex = 0;

  // Channel-level fallback date if available
  const channelDateRaw =
    extractText(xml, "lastBuildDate") || extractText(xml, "pubDate");
  let channelBaseTime = Date.now();
  if (channelDateRaw) {
    const t = new Date(channelDateRaw).getTime();
    if (!Number.isNaN(t) && t > 0) channelBaseTime = t;
  }

  while (match !== null) {
    const block = match[1];

    // Extract image BEFORE stripping tags (media:content / enclosure / <img>)
    const rawImage =
      block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ??
      block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1] ??
      block.match(
        /<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image[^"']*["']/i,
      )?.[1] ??
      block.match(/<image[^>]*><url>([^<]+)<\/url>/i)?.[1] ??
      block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ??
      "";
    const imageUrl = rawImage
      ? rawImage.replace(/&amp;/g, "&").trim().slice(0, 500)
      : undefined;

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
      // Strip only control characters — preserve Indic/Arabic/CJK scripts
      // biome-ignore lint/suspicious/noControlCharactersInRegex: clean ASCII control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
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

    // Strip ad boilerplate, syndication footers, backlinks
    const desc = decodedDesc
      .replace(/Continue reading\.\.\./gi, "")
      .replace(/Read more\.\.\./gi, "")
      .replace(/The post .* appeared first on .*\./gi, "")
      .replace(/Follow us on (Twitter|X|Facebook|Instagram|Telegram).*/gi, "")
      .replace(/Subscribe to our (channel|newsletter|feed).*/gi, "")
      .replace(/\[\s*Advertisement\s*\]/gi, "")
      .replace(/ADVERTISEMENT/gi, "")
      .replace(/Reported by [^.]+\.\s*/gi, "")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1000);

    const pubDateRaw =
      extractText(block, "pubDate") ||
      extractText(block, "published") ||
      extractText(block, "updated") ||
      extractText(block, "dc:date") ||
      extractText(block, "a10:updated");

    if (title && link) {
      let pubDate: string;
      const parsedTime = pubDateRaw ? new Date(pubDateRaw).getTime() : NaN;
      if (!Number.isNaN(parsedTime) && parsedTime > 0) {
        pubDate = new Date(parsedTime).toISOString();
      } else {
        // Try date from URL (e.g. /2026/08/29/)
        const urlDateMatch = link.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
        let baseTime = channelBaseTime;
        if (urlDateMatch) {
          const y = Number.parseInt(urlDateMatch[1], 10);
          const m = Number.parseInt(urlDateMatch[2], 10) - 1;
          const d = Number.parseInt(urlDateMatch[3], 10);
          const urlDate = new Date(Date.UTC(y, m, d, 12, 0, 0));
          if (!Number.isNaN(urlDate.getTime())) {
            baseTime = Math.min(
              Date.now(),
              urlDate.getTime() + 18 * 3600 * 1000,
            );
          }
        }
        // Stagger articles by chronological position in feed
        const staggerOffsetMs =
          (itemIndex * 22 + (itemIndex % 7) * 5) * 60 * 1000;
        pubDate = new Date(baseTime - staggerOffsetMs).toISOString();
      }

      items.push({
        url: link,
        title,
        description: desc || `Reported by ${domain}.`,
        pubDate,
        domain,
        language: lang ?? "English",
        sourcecountry: country,
        imageUrl,
      });
      itemIndex++;
    }

    match = itemRe.exec(xml);
  }

  return items;
}

async function fetchFeed(
  feedUrl: string,
  domain: string,
  country: string,
  lang?: string,
): Promise<RssArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AakashSanchar/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, domain, country, lang);
  } catch {
    return [];
  }
}

async function fetchAllFeeds(feeds: RssFeed[]): Promise<RssArticle[]> {
  const results = await Promise.all(
    feeds.map((f) => fetchFeed(f.url, f.domain, f.country, f.lang)),
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

  // Resolve a real place per article. Done here, server-side, because the
  // gazetteer is ~3 MB and must never reach the browser. Articles that resolve
  // to nothing keep lat/lng undefined and simply get no map marker.
  let placed = 0;
  for (const art of all) {
    const hit = resolvePlace(art.title, art.description, art.sourcecountry);
    if (hit) {
      art.lat = hit.lat;
      art.lng = hit.lng;
      art.locationName = hit.locationName;
      placed++;
    }
  }
  console.log(`[RSS Articles] geocoded ${placed}/${all.length} articles`);

  return all;
}

// Refresh
//
// This used to be fire-and-forget: the handler kicked it off and returned mock
// articles immediately. That works on a long-lived node server (the promise
// keeps running and fills the cache for the next request) and never works on
// Vercel, where the lambda is frozen the moment the response is sent — so the
// cache was never populated and production served the mock set forever.
//
// Now: the first request on a cold instance awaits this. Concurrent requests
// share the same in-flight promise instead of each starting their own pass.
const inFlight = new Map<string, Promise<CacheEntry | null>>();

async function refresh(
  cacheKey: string,
  region: string,
): Promise<CacheEntry | null> {
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const run = (async (): Promise<CacheEntry | null> => {
    lastAttempt = Date.now();
    try {
      const articles = await fetchAllFeeds(feedsForRegion(region));
      if (articles.length === 0) {
        console.warn("[RSS Articles] All feeds returned empty");
        return null;
      }
      // One pass over the geocoded set, once per refresh. This is the whole
      // "server-side precompute" — no cron, no database, no per-request cost.
      const digests = buildLocationDigests(
        articles
          .filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lng))
          .map((a) => ({
            id: a.url,
            title: a.title,
            description: a.description,
            source: a.domain,
            category: "news" as const,
            tag: "General",
            publishedAt: a.pubDate,
            locationName: a.locationName ?? "",
            lat: a.lat as number,
            lng: a.lng as number,
            intensity: 0.6,
          })),
      );
      const entry: CacheEntry = { articles, digests, timestamp: Date.now() };
      cache.set(cacheKey, entry);
      console.log(
        `[RSS Articles] Cached ${articles.length} articles, ${digests.length} location digests (${region})`,
      );
      return entry;
    } catch (err) {
      console.error("[RSS Articles] Error:", err);
      return null;
    }
  })();

  // Registered before the cleanup is attached: if the body ever threw
  // synchronously, a `finally` inside it would delete the entry before this set
  // and wedge every later request on a dead promise.
  inFlight.set(cacheKey, run);
  void run.finally(() => inFlight.delete(cacheKey));
  return run;
}

function payload(entry: CacheEntry, stale: boolean) {
  return NextResponse.json({
    articles: entry.articles,
    locations: entry.digests,
    cached: true,
    stale,
    cachedAt: new Date(entry.timestamp).toISOString(),
    count: entry.articles.length,
  });
}

// Route handler
export async function GET(request: NextRequest) {
  const region =
    request.nextUrl.searchParams.get("region") === "south-asia"
      ? "south-asia"
      : "world";
  const cacheKey = `rss:${region}`;
  const cached = cache.get(cacheKey);

  // Fresh cache → return immediately
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return payload(cached, false);
  }

  // Stale but usable → serve it now and refresh behind it. Safe to not await:
  // if the lambda freezes mid-refresh we still served real data, and the next
  // cold instance takes the awaited path below.
  if (cached) {
    if (Date.now() - lastAttempt > MIN_RETRY_MS) {
      refresh(cacheKey, region).catch(() => {});
    }
    return payload(cached, true);
  }

  // Nothing cached at all. Await — returning an empty set here is what made
  // production look permanently empty.
  const entry = await refresh(cacheKey, region);
  if (entry) return payload(entry, false);

  // Every feed failed. Say so honestly rather than inventing headlines: the
  // client draws no markers and the ticker shows its own status line.
  return NextResponse.json({
    articles: [],
    locations: [],
    cached: false,
    stale: true,
    error: "upstream feeds unavailable",
    cachedAt: new Date().toISOString(),
    count: 0,
  });
}
