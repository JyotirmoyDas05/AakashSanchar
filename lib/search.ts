import type { NewsEvent } from "@/types/news";

export interface SpatialBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface LocationEntity {
  id: string;
  name: string;
  fullName: string;
  type: "country" | "region" | "city";
  lat: number;
  lng: number;
  bounds: SpatialBounds;
  eventCount: number;
  eventIds: string[];
  dominantCategory: string;
}

export interface TopicEntity {
  id: string;
  name: string;
  eventCount: number;
  eventIds: string[];
  category: string;
  bounds: SpatialBounds | null;
  lat: number | null;
  lng: number | null;
}

export interface StructuredSearchResult {
  query: string;
  tokens: string[];
  locations: LocationEntity[];
  topics: TopicEntity[];
  events: NewsEvent[];
  globalBounds: SpatialBounds | null;
  primaryCentroid: [number, number] | null;
  primaryCountry: string | null;
}

export interface SearchResult {
  results: NewsEvent[];
  bounds: SpatialBounds | null;
  centroid: [number, number] | null;
  primaryCountry: string | null;
  query: string;
  tokens: string[];
}

const ISO_COUNTRIES: Record<string, string> = {
  afghanistan: "af",
  albania: "al",
  algeria: "dz",
  andorra: "ad",
  angola: "ao",
  argentina: "ar",
  armenia: "am",
  australia: "au",
  austria: "at",
  azerbaijan: "az",
  bahamas: "bs",
  bahrain: "bh",
  bangladesh: "bd",
  belarus: "by",
  belgium: "be",
  belize: "bz",
  benin: "bj",
  bhutan: "bt",
  bolivia: "bo",
  bosnia: "ba",
  brazil: "br",
  bulgaria: "bg",
  burkina: "bf",
  burundi: "bi",
  cambodia: "kh",
  cameroon: "cm",
  canada: "ca",
  chile: "cl",
  china: "cn",
  colombia: "co",
  congo: "cg",
  costa_rica: "cr",
  croatia: "hr",
  cuba: "cu",
  cyprus: "cy",
  czech: "cz",
  denmark: "dk",
  djibouti: "dj",
  dominican: "do",
  ecuador: "ec",
  egypt: "eg",
  el_salvador: "sv",
  estonia: "ee",
  ethiopia: "et",
  finland: "fi",
  france: "fr",
  georgia: "ge",
  germany: "de",
  ghana: "gh",
  greece: "gr",
  guatemala: "gt",
  haiti: "ht",
  honduras: "hn",
  hungary: "hu",
  iceland: "is",
  india: "in",
  indonesia: "id",
  iran: "ir",
  iraq: "iq",
  ireland: "ie",
  israel: "il",
  italy: "it",
  jamaica: "jm",
  japan: "jp",
  jordan: "jo",
  kazakhstan: "kz",
  kenya: "ke",
  kuwait: "kw",
  kyrgyzstan: "kg",
  laos: "la",
  latvia: "lv",
  lebanon: "lb",
  libya: "ly",
  lithuania: "lt",
  luxembourg: "lu",
  madagascar: "mg",
  malaysia: "my",
  maldives: "mv",
  mali: "ml",
  malta: "mt",
  mexico: "mx",
  moldova: "md",
  monaco: "mc",
  mongolia: "mn",
  montenegro: "me",
  morocco: "ma",
  mozambique: "mz",
  myanmar: "mm",
  namibia: "na",
  nepal: "np",
  netherlands: "nl",
  new_zealand: "nz",
  nicaragua: "ni",
  niger: "ne",
  nigeria: "ng",
  north_korea: "kp",
  norway: "no",
  oman: "om",
  pakistan: "pk",
  palestine: "ps",
  panama: "pa",
  paraguay: "py",
  peru: "pe",
  philippines: "ph",
  poland: "pl",
  portugal: "pt",
  qatar: "qa",
  romania: "ro",
  russia: "ru",
  rwanda: "rw",
  saudi_arabia: "sa",
  senegal: "sn",
  serbia: "rs",
  singapore: "sg",
  slovakia: "sk",
  slovenia: "si",
  somalia: "so",
  south_africa: "za",
  south_korea: "kr",
  spain: "es",
  sri_lanka: "lk",
  sudan: "sd",
  sweden: "se",
  switzerland: "ch",
  syria: "sy",
  taiwan: "tw",
  tajikistan: "tj",
  tanzania: "tz",
  thailand: "th",
  tunisia: "tn",
  turkey: "tr",
  turkiye: "tr",
  uganda: "ug",
  ukraine: "ua",
  uae: "ae",
  united_arab_emirates: "ae",
  uk: "gb",
  united_kingdom: "gb",
  great_britain: "gb",
  usa: "us",
  united_states: "us",
  uruguay: "uy",
  uzbekistan: "uz",
  venezuela: "ve",
  vietnam: "vn",
  yemen: "ye",
  zambia: "zm",
  zimbabwe: "zw",
};

export function getCountryFlagImgUrl(nameOrCode: string): string | null {
  if (!nameOrCode) return null;
  const clean = nameOrCode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");
  if (clean.length === 2) {
    const c = clean === "uk" ? "gb" : clean;
    return `https://flagcdn.com/${c}.svg`;
  }
  if (ISO_COUNTRIES[clean]) {
    return `https://flagcdn.com/${ISO_COUNTRIES[clean]}.svg`;
  }
  const parts = nameOrCode.split(/[,;/]/).map((p) =>
    p
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_"),
  );
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (ISO_COUNTRIES[part]) {
      return `https://flagcdn.com/${ISO_COUNTRIES[part]}.svg`;
    }
  }
  return null;
}

function normalizeToken(t: string): string {
  return t.toLowerCase().replace(/s$|ing$/i, "");
}

export function tokenize(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .map(normalizeToken)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 1) return 2;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function fuzzyIncludes(hay: string, tok: string): boolean {
  if (hay.includes(tok)) return true;
  const words = hay.split(/[\s,./\-_]+/);
  for (const w of words) {
    if (tok.length >= 3 && w.startsWith(tok)) return true;
    if (
      tok.length >= 5 &&
      Math.abs(w.length - tok.length) <= 1 &&
      levenshtein(w, tok) <= 1
    ) {
      return true;
    }
  }
  return false;
}

// Outlier-resistant spatial density clustering
export function calculateCoreSpatialCluster(events: NewsEvent[]): {
  coreEvents: NewsEvent[];
  bounds: SpatialBounds | null;
  centroid: [number, number] | null;
} {
  const valid = events.filter(
    (e) => Number.isFinite(e.lat) && Number.isFinite(e.lng),
  );
  if (!valid.length) {
    return { coreEvents: [], bounds: null, centroid: null };
  }
  if (valid.length <= 2) {
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;
    let sLat = 0,
      sLng = 0;
    for (const e of valid) {
      minLat = Math.min(minLat, e.lat);
      maxLat = Math.max(maxLat, e.lat);
      minLng = Math.min(minLng, e.lng);
      maxLng = Math.max(maxLng, e.lng);
      sLat += e.lat;
      sLng += e.lng;
    }
    const padLat = Math.max(0.6, (maxLat - minLat) * 0.2);
    const padLng = Math.max(0.6, (maxLng - minLng) * 0.2);
    return {
      coreEvents: valid,
      bounds: {
        minLat: minLat - padLat,
        maxLat: maxLat + padLat,
        minLng: minLng - padLng,
        maxLng: maxLng + padLng,
      },
      centroid: [sLat / valid.length, sLng / valid.length],
    };
  }

  // Group events into connected spatial clusters (radius ~1000km / ~9 degrees)
  const clusters: NewsEvent[][] = [];
  const assigned = new Set<string>();

  for (const e of valid) {
    if (assigned.has(e.id)) continue;
    const cluster: NewsEvent[] = [e];
    assigned.add(e.id);

    for (const other of valid) {
      if (assigned.has(other.id)) continue;
      const dLat = Math.abs(other.lat - e.lat);
      const dLng = Math.abs(other.lng - e.lng);
      // Rough distance check (~1000km)
      if (dLat <= 9 && dLng <= 12) {
        assigned.add(other.id);
        cluster.push(other);
      }
    }
    clusters.push(cluster);
  }

  // Sort clusters by event count descending
  clusters.sort((a, b) => b.length - a.length);
  const dominantCluster = clusters[0] || valid;

  // Use dominant cluster if it represents a significant portion or has multiple points
  const coreEvents =
    dominantCluster.length >= 2 || dominantCluster.length >= valid.length * 0.4
      ? dominantCluster
      : valid;

  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  let sumLat = 0,
    sumLng = 0;

  for (const e of coreEvents) {
    minLat = Math.min(minLat, e.lat);
    maxLat = Math.max(maxLat, e.lat);
    minLng = Math.min(minLng, e.lng);
    maxLng = Math.max(maxLng, e.lng);
    sumLat += e.lat;
    sumLng += e.lng;
  }

  const cLat = sumLat / coreEvents.length;
  const cLng = sumLng / coreEvents.length;
  const padLat = Math.max(0.5, (maxLat - minLat) * 0.2);
  const padLng = Math.max(0.5, (maxLng - minLng) * 0.2);

  return {
    coreEvents,
    bounds: {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    },
    centroid: [cLat, cLng],
  };
}

// Clean and standardize location segment titles
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

// Extracts all location & topic entities dynamically from active events
export function extractDynamicEntities(events: NewsEvent[]): {
  locations: LocationEntity[];
  topics: TopicEntity[];
} {
  const locMap = new Map<
    string,
    {
      name: string;
      fullName: string;
      type: "country" | "region" | "city";
      events: NewsEvent[];
    }
  >();

  const topicMap = new Map<
    string,
    {
      name: string;
      category: string;
      events: NewsEvent[];
    }
  >();

  for (const e of events) {
    if (!e.locationName || e.locationName === "SYSTEM STATUS") continue;

    // Parse location hierarchy (e.g. "Rasuwa, Nepal" or "London, United Kingdom")
    const parts = e.locationName
      .split(/[,;/]/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 2);

    if (parts.length > 0) {
      // Primary country / major entity (last part)
      const countryRaw = parts[parts.length - 1];
      const countryKey = countryRaw.toLowerCase();
      const canonicalCountry = toTitleCase(countryRaw);

      if (!locMap.has(countryKey)) {
        locMap.set(countryKey, {
          name: canonicalCountry,
          fullName: canonicalCountry,
          type: "country",
          events: [],
        });
      }
      locMap.get(countryKey)?.events.push(e);

      // City / district entity if multi-part
      if (parts.length > 1) {
        const cityRaw = parts[0];
        const cityKey = `${cityRaw.toLowerCase()}_${countryKey}`;
        const canonicalCity = toTitleCase(cityRaw);
        const fullCity = `${canonicalCity}, ${canonicalCountry}`;

        if (!locMap.has(cityKey)) {
          locMap.set(cityKey, {
            name: canonicalCity,
            fullName: fullCity,
            type: "city",
            events: [],
          });
        }
        locMap.get(cityKey)?.events.push(e);
      }
    }

    // Dynamic topics from event tags & categories
    const tag = e.tag || e.category;
    if (tag && tag.toLowerCase() !== "general") {
      const tagKey = tag.toLowerCase();
      if (!topicMap.has(tagKey)) {
        topicMap.set(tagKey, {
          name: tag,
          category: e.category || "news",
          events: [],
        });
      }
      topicMap.get(tagKey)?.events.push(e);
    }
  }

  // Convert location map to LocationEntity list with spatial clustering
  const locations: LocationEntity[] = [];
  for (const [key, val] of locMap) {
    if (!val.events.length) continue;
    const { bounds, centroid } = calculateCoreSpatialCluster(val.events);
    if (!bounds || !centroid) continue;

    // Find dominant category
    const catCounts = new Map<string, number>();
    for (const ev of val.events) {
      const cat = ev.category || "news";
      catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
    }
    let domCat = "news";
    let maxCat = 0;
    for (const [c, n] of catCounts) {
      if (n > maxCat) {
        maxCat = n;
        domCat = c;
      }
    }

    locations.push({
      id: `loc-${key}`,
      name: val.name,
      fullName: val.fullName,
      type: val.type,
      lat: centroid[0],
      lng: centroid[1],
      bounds,
      eventCount: val.events.length,
      eventIds: val.events.map((e) => e.id),
      dominantCategory: domCat,
    });
  }

  // Convert topic map to TopicEntity list
  const topics: TopicEntity[] = [];
  for (const [key, val] of topicMap) {
    if (!val.events.length) continue;
    const { bounds, centroid } = calculateCoreSpatialCluster(val.events);
    topics.push({
      id: `topic-${key}`,
      name: val.name,
      eventCount: val.events.length,
      eventIds: val.events.map((e) => e.id),
      category: val.category,
      bounds,
      lat: centroid ? centroid[0] : null,
      lng: centroid ? centroid[1] : null,
    });
  }

  // Sort by event count descending
  locations.sort((a, b) => b.eventCount - a.eventCount);
  topics.sort((a, b) => b.eventCount - a.eventCount);

  return { locations, topics };
}

function haystackFor(e: NewsEvent): string {
  return `${e.title} ${e.description} ${e.locationName} ${e.source} ${e.tag ?? ""} ${e.category}`.toLowerCase();
}

function scoreEvent(e: NewsEvent, tokens: string[]): number {
  const hay = haystackFor(e);
  const hayTitle = e.title.toLowerCase();
  const hayTag = (e.tag ?? "").toLowerCase();
  const hayLoc = e.locationName.toLowerCase();
  let s = 0;
  for (const tok of tokens) {
    const inTitle = fuzzyIncludes(hayTitle, tok);
    const inTag = hayTag === tok || fuzzyIncludes(hayTag, tok);
    const inLoc = fuzzyIncludes(hayLoc, tok);
    const inHay = fuzzyIncludes(hay, tok);
    if (!inHay) return -1;
    if (inLoc) s += 4;
    else if (inTag) s += 3;
    else if (inTitle) s += 2;
    else s += 1;
  }
  const hoursAgo = (Date.now() - new Date(e.publishedAt).getTime()) / 3600000;
  s += 0.5 / (1 + Math.max(0, hoursAgo) / 24);
  return s;
}

// Search all entities with prefix & multi-token matching
export function searchAllEntities(
  events: NewsEvent[],
  q: string,
): StructuredSearchResult {
  const query = q.trim();
  const tokens = tokenize(query);
  const qLower = query.toLowerCase();

  if (!query || !tokens.length) {
    return {
      query,
      tokens: [],
      locations: [],
      topics: [],
      events: [],
      globalBounds: null,
      primaryCentroid: null,
      primaryCountry: null,
    };
  }

  const { locations: allLocations, topics: allTopics } =
    extractDynamicEntities(events);

  // Match locations (prefix / fuzzy)
  const matchedLocations = allLocations
    .filter((loc) => {
      const nameLower = loc.name.toLowerCase();
      const fullLower = loc.fullName.toLowerCase();
      if (nameLower.startsWith(qLower) || fullLower.startsWith(qLower))
        return true;
      if (nameLower.includes(qLower) || fullLower.includes(qLower)) return true;
      return tokens.every(
        (tok) => fuzzyIncludes(nameLower, tok) || fuzzyIncludes(fullLower, tok),
      );
    })
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(qLower);
      const bStarts = b.name.toLowerCase().startsWith(qLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return b.eventCount - a.eventCount;
    });

  // Match topics
  const matchedTopics = allTopics
    .filter((top) => {
      const nameLower = top.name.toLowerCase();
      if (nameLower.startsWith(qLower) || nameLower.includes(qLower))
        return true;
      return tokens.every((tok) => fuzzyIncludes(nameLower, tok));
    })
    .sort((a, b) => b.eventCount - a.eventCount);

  // Match leaf events
  const scored: Array<{ e: NewsEvent; s: number }> = [];
  for (const e of events) {
    const s = scoreEvent(e, tokens);
    if (s >= 0) scored.push({ e, s });
  }
  scored.sort((a, b) => b.s - a.s);
  const matchedEvents = scored.map((x) => x.e);

  const { bounds: globalBounds, centroid: primaryCentroid } =
    calculateCoreSpatialCluster(matchedEvents);

  const primaryCountry = matchedLocations[0]?.name || null;

  return {
    query,
    tokens,
    locations: matchedLocations.slice(0, 8),
    topics: matchedTopics.slice(0, 6),
    events: matchedEvents.slice(0, 50),
    globalBounds,
    primaryCentroid,
    primaryCountry,
  };
}

// Backward compatible search wrapper
export function searchEvents(events: NewsEvent[], q: string): SearchResult {
  const res = searchAllEntities(events, q);
  return {
    results: res.events,
    bounds: res.globalBounds,
    centroid: res.primaryCentroid,
    primaryCountry: res.primaryCountry,
    query: res.query,
    tokens: res.tokens,
  };
}
