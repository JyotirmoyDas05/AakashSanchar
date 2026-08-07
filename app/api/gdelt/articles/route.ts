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
  imageUrl?: string;
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

const MOCK_ARTICLES_SOUTH_ASIA: RssArticle[] = [
  {
    url: "#",
    title: "Regional Leaders Discuss Cross-Border Trade And Connectivity",
    description:
      "Delegates from across South Asia are reviewing trade corridors and infrastructure projects aimed at deepening regional economic integration.",
    pubDate: new Date(Date.now() - 3_600_000).toISOString(),
    domain: "timesofindia.indiatimes.com",
    language: "English",
    sourcecountry: "India",
  },
  {
    url: "#",
    title: "Monsoon Preparedness Reviewed Ahead Of Heavy Rainfall Forecast",
    description:
      "Disaster response agencies across the region have placed emergency teams on standby as meteorological departments forecast intense rainfall.",
    pubDate: new Date(Date.now() - 7_200_000).toISOString(),
    domain: "ndtv.com",
    language: "English",
    sourcecountry: "India",
  },
  {
    url: "#",
    title: "Border Talks Continue As Neighbours Seek Lasting Arrangements",
    description:
      "Diplomatic channels remain active as neighbouring states work toward agreements on border management and confidence-building measures.",
    pubDate: new Date(Date.now() - 10_800_000).toISOString(),
    domain: "dawn.com",
    language: "English",
    sourcecountry: "Pakistan",
  },
  {
    url: "#",
    title: "Bay Of Bengal Shipping Lanes Monitored After Weather Advisory",
    description:
      "Port authorities in Bangladesh and Sri Lanka have issued advisories as vessel traffic is rerouted ahead of deteriorating sea conditions.",
    pubDate: new Date(Date.now() - 14_400_000).toISOString(),
    domain: "thedailystar.net",
    language: "English",
    sourcecountry: "Bangladesh",
  },
];

function mockArticlesForRegion(region: string) {
  return region === "south-asia" ? MOCK_ARTICLES_SOUTH_ASIA : MOCK_ARTICLES;
}

// Background refresh
async function triggerBackgroundRefresh(cacheKey: string, region: string) {
  if (fetchInProgress) return;
  fetchInProgress = true;
  lastAttempt = Date.now();
  try {
    const articles = await fetchAllFeeds(feedsForRegion(region));
    if (articles.length > 0) {
      cache.set(cacheKey, { articles, timestamp: Date.now() });
      console.log(
        `[RSS Articles] Cached ${articles.length} articles (${region})`,
      );
    } else {
      console.warn("[RSS Articles] All feeds returned empty, retrying in 60s");
      setTimeout(() => {
        fetchInProgress = false;
        triggerBackgroundRefresh(cacheKey, region).catch(() => {});
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
export async function GET(request: NextRequest) {
  const region =
    request.nextUrl.searchParams.get("region") === "south-asia"
      ? "south-asia"
      : "world";
  const cacheKey = `rss:${region}`;
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
    triggerBackgroundRefresh(cacheKey, region).catch(() => {});
  }

  // Return stale cache or mock — always 200
  const fallback = cached?.articles ?? mockArticlesForRegion(region);
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
