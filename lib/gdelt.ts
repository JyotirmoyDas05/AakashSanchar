/**
 * GDELT data fetching + parsing utilities.
 * - Events CSV: 15-min updates from data.gdeltproject.org
 * - DOC API: article lists from api.gdeltproject.org
 */

import { extractTitleFromUrl } from "@/lib/articleTitle";
import type { NewsCategory, NewsEvent } from "@/types/news";

// ── CAMEO event code → category mapping ──
// https://parusanalytics.com/eventdata/data.dir/cameo.html
function cameoToCategory(code: string): NewsCategory {
  const root = code.substring(0, 2);
  // 18x = ASSAULT, 19x = FIGHT, 20x = MASS VIOLENCE
  if (root === "18" || root === "19" || root === "20") return "conflict";
  // 14x = PROTEST, 15x = COERCE
  if (root === "14" || root === "15") return "conflict";
  // Natural disasters don't have a CAMEO code, so we use Goldstein-based heuristics
  // 17x = THREATEN
  if (root === "17") return "conflict";
  // Positive cooperation events
  if (root === "01" || root === "02" || root === "03") return "news";
  // Diplomatic events
  if (root === "04" || root === "05" || root === "06") return "news";
  // Material aid
  if (root === "07" || root === "08") return "news";
  // Investigate / restrict
  if (root === "09" || root === "10" || root === "11" || root === "12")
    return "news";
  // Reduce / reject
  if (root === "13" || root === "16") return "news";
  return "news";
}

// ── Goldstein scale → intensity (0-1) ──
function goldsteinToIntensity(goldstein: number): number {
  // Scale is -10 to +10; map absolute value to 0-1
  return Math.min(1, Math.max(0.1, Math.abs(goldstein) / 10));
}

// ── Keyword-based category refinement from title/source ──
function refineCategory(
  title: string,
  source: string,
  baseCategory: NewsCategory,
): NewsCategory {
  const t = `${title} ${source}`.toLowerCase();
  if (
    t.includes("earthquake") ||
    t.includes("tsunami") ||
    t.includes("hurricane") ||
    t.includes("tornado") ||
    t.includes("flood") ||
    t.includes("wildfire") ||
    t.includes("volcano") ||
    t.includes("cyclone") ||
    t.includes("landslide") ||
    t.includes("drought")
  )
    return "disaster";
  if (
    t.includes("outbreak") ||
    t.includes("pandemic") ||
    t.includes("epidemic") ||
    t.includes("virus") ||
    t.includes("ebola") ||
    t.includes("cholera") ||
    t.includes("plague") ||
    t.includes("influenza") ||
    t.includes("who warns") ||
    t.includes("health emergency") ||
    t.includes("disease")
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
    t.includes("clash")
  )
    return "conflict";
  return baseCategory;
}

// ── GDELT Events CSV column indices (58-col GDELT 2.0 schema) ──
const COL = {
  GLOBALEVENTID: 0,
  ACTOR1_NAME: 6,
  ACTOR1_COUNTRY: 7,
  ACTOR2_NAME: 16,
  ACTOR2_COUNTRY: 17,
  EVENT_CODE: 26,
  EVENT_BASE_CODE: 28,
  GOLDSTEIN: 30,
  NUM_MENTIONS: 31,
  AVG_TONE: 34,
  ACTOR1_GEO_FULLNAME: 36,
  ACTOR1_GEO_LAT: 40,
  ACTOR1_GEO_LONG: 41,
  ACTION_GEO_FULLNAME: 52,
  ACTION_GEO_LAT: 56,
  ACTION_GEO_LONG: 57,
  DATEADDED: 59,
  SOURCEURL: 60,
} as const;

export interface GdeltRawEvent {
  id: string;
  actor1Name: string;
  actor1Country: string;
  actor2Name: string;
  actor2Country: string;
  eventCode: string;
  goldstein: number;
  numMentions: number;
  avgTone: number;
  locationName: string;
  lat: number;
  lng: number;
  dateAdded: string;
  sourceUrl: string;
}

/** Parse a single line of GDELT events CSV */
function parseEventLine(line: string): GdeltRawEvent | null {
  const fields = line.split("\t");
  if (fields.length < 61) return null;

  const lat = Number.parseFloat(fields[COL.ACTION_GEO_LAT]);
  const lng = Number.parseFloat(fields[COL.ACTION_GEO_LONG]);

  // Skip events without geo coordinates
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  // Skip 0,0 placeholder coords
  if (lat === 0 && lng === 0) return null;

  return {
    id: fields[COL.GLOBALEVENTID],
    actor1Name: fields[COL.ACTOR1_NAME] || "",
    actor1Country: fields[COL.ACTOR1_COUNTRY] || "",
    actor2Name: fields[COL.ACTOR2_NAME] || "",
    actor2Country: fields[COL.ACTOR2_COUNTRY] || "",
    eventCode: fields[COL.EVENT_CODE] || "",
    goldstein: Number.parseFloat(fields[COL.GOLDSTEIN]) || 0,
    numMentions: Number.parseInt(fields[COL.NUM_MENTIONS], 10) || 0,
    avgTone: Number.parseFloat(fields[COL.AVG_TONE]) || 0,
    locationName: fields[COL.ACTION_GEO_FULLNAME] || "Unknown",
    lat,
    lng,
    dateAdded: fields[COL.DATEADDED] || "",
    sourceUrl: (fields[COL.SOURCEURL] || "").trim(),
  };
}

/** Convert GDELT dateAdded (YYYYMMDDHHMMSS) to ISO string */
function gdeltDateToISO(dateAdded: string): string {
  if (dateAdded.length < 14) return new Date().toISOString();
  const y = dateAdded.substring(0, 4);
  const m = dateAdded.substring(4, 6);
  const d = dateAdded.substring(6, 8);
  const h = dateAdded.substring(8, 10);
  const min = dateAdded.substring(10, 12);
  const s = dateAdded.substring(12, 14);
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`).toISOString();
}

// ── CAMEO actor type → readable label ──
const CAMEO_ACTOR_LABELS: Record<string, string> = {
  // Governments & Military
  GOV: "Government",
  MIL: "Military",
  REB: "Rebel Forces",
  OPP: "Opposition",
  COP: "Police",
  AGR: "Agricultural Sector",
  BUS: "Business",
  CIV: "Civilians",
  CVL: "Civilians",
  EDU: "Education Sector",
  ELI: "Elite",
  IGO: "International Organization",
  INS: "Insurgents",
  JUD: "Judiciary",
  LAB: "Labor/Workers",
  LEG: "Legislature",
  MED: "Media",
  NGO: "NGO",
  OTH: "Other",
  POL: "Political Actor",
  REF: "Refugees",
  REL: "Religious Group",
  SPY: "Intelligence Agency",
  UAF: "Unaligned Forces",
  // Known country-based actors
  USA: "United States",
  GBR: "United Kingdom",
  CHN: "China",
  RUS: "Russia",
  DEU: "Germany",
  FRA: "France",
  ISR: "Israel",
  IRN: "Iran",
  SAU: "Saudi Arabia",
  TUR: "Turkey",
  IND: "India",
  PAK: "Pakistan",
  PRK: "North Korea",
  KOR: "South Korea",
  JPN: "Japan",
  BRA: "Brazil",
  AUS: "Australia",
  CAN: "Canada",
  UKR: "Ukraine",
  SYR: "Syria",
  IRQ: "Iraq",
  AFG: "Afghanistan",
  PSE: "Palestine",
  EGY: "Egypt",
  NGA: "Nigeria",
  ZAF: "South Africa",
  ETH: "Ethiopia",
  KEN: "Kenya",
  MEX: "Mexico",
  VEN: "Venezuela",
  COL: "Colombia",
};

// ── CAMEO event verb descriptions ──
const CAMEO_VERB: Record<string, string> = {
  "01": "Statement",
  "02": "Appeals",
  "03": "Expressed Intent to Cooperate",
  "04": "Consultations",
  "05": "Diplomatic Cooperation",
  "06": "Material Cooperation",
  "07": "Aid Provided",
  "08": "Yielded Position",
  "09": "Investigation",
  "10": "Demand",
  "11": "Disapproval",
  "12": "Rejected",
  "13": "Threatened",
  "14": "Protest",
  "15": "Coercion",
  "16": "Assault",
  "17": "Coercion",
  "18": "Assault",
  "19": "Armed Conflict",
  "20": "Mass Violence",
};

function resolveActorName(name: string, country: string): string {
  if (!name && !country) return "";
  const code = name || country;
  // Try direct CAMEO lookup
  if (CAMEO_ACTOR_LABELS[code]) return CAMEO_ACTOR_LABELS[code];
  // Title-case the raw string (e.g. "CANADIAN" -> "Canadian")
  return code.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toTitleCase(str: string): string {
  return str
    .split(",")[0]
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Build a readable title from raw event data */
function buildTitle(raw: GdeltRawEvent): string {
  const actor1 = resolveActorName(raw.actor1Name, raw.actor1Country);
  const actor2 = resolveActorName(raw.actor2Name, raw.actor2Country);
  const location = toTitleCase(raw.locationName);
  const verb = CAMEO_VERB[raw.eventCode.substring(0, 2)] || "Event Reported";

  if (actor1 && actor2) {
    return `${actor1} and ${actor2}: ${verb} in ${location}`;
  }
  if (actor1) {
    return `${actor1}: ${verb} in ${location}`;
  }
  return `${verb} in ${location}`;
}

/** Convert raw GDELT event to our NewsEvent format */
function rawToNewsEvent(raw: GdeltRawEvent): NewsEvent {
  const baseCategory = cameoToCategory(raw.eventCode);
  const title = extractTitleFromUrl(raw.sourceUrl) || buildTitle(raw);
  const category = refineCategory(title, raw.sourceUrl, baseCategory);
  const domain = extractDomain(raw.sourceUrl);

  // Tone-based sentiment label
  const toneLabel =
    raw.avgTone > 3 ? "Positive" : raw.avgTone < -3 ? "Negative" : "Neutral";

  // Pseudo-random offset based on the event ID (up to 15 mins) to prevent identical timestamps
  const seed = raw.id
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomOffsetMs = (seed % 900) * 1000;
  const baseDate = new Date(gdeltDateToISO(raw.dateAdded));
  const publishedAt = new Date(
    baseDate.getTime() - randomOffsetMs,
  ).toISOString();

  return {
    id: `gdelt-${raw.id}`,
    title,
    description: `${toneLabel} coverage across ${raw.numMentions} source${raw.numMentions !== 1 ? "s" : ""}. Goldstein stability score: ${raw.goldstein.toFixed(1)}. Reported by ${domain}.`,
    source: domain,
    category,
    publishedAt,
    locationName: toTitleCase(raw.locationName),
    lat: raw.lat,
    lng: raw.lng,
    intensity: goldsteinToIntensity(raw.goldstein),
    url: raw.sourceUrl,
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

/**
 * Applies deterministic micro-jitter (~200m-400m) to events sharing identical coordinates.
 * Allows Leaflet.markercluster to zoom into city-level bounds smoothly before disaggregating.
 */
export function applyCoordinateJitter(events: NewsEvent[]): NewsEvent[] {
  const coordCounts = new Map<string, number>();
  return events.map((event) => {
    const key = `${event.lat.toFixed(4)},${event.lng.toFixed(4)}`;
    const count = coordCounts.get(key) || 0;
    coordCounts.set(key, count + 1);

    if (count === 0) return event;

    const angle = count * 2.39996; // Golden angle (~137.5 deg)
    const radius = 0.0025 * Math.sqrt(count); // ~250m base radius
    const latRad = (event.lat * Math.PI) / 180;
    const cosLat = Math.cos(latRad) || 1;

    const dLat = radius * Math.cos(angle);
    const dLng = (radius * Math.sin(angle)) / cosLat;

    return {
      ...event,
      lat: Number.parseFloat((event.lat + dLat).toFixed(6)),
      lng: Number.parseFloat((event.lng + dLng).toFixed(6)),
    };
  });
}

// ── Public API ──

/** Parse GDELT events CSV text into NewsEvent[] */
export function parseGdeltEventsCsv(csvText: string): NewsEvent[] {
  const lines = csvText.trim().split("\n");
  const events: NewsEvent[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const raw = parseEventLine(line);
    if (!raw) continue;
    // Deduplicate by source URL
    if (seen.has(raw.sourceUrl)) continue;
    seen.add(raw.sourceUrl);
    events.push(rawToNewsEvent(raw));
  }

  // Sort by number of mentions (most prominent first)
  events.sort((a, b) => {
    const mentionsA =
      Number.parseInt(a.description.match(/Mentions: (\d+)/)?.[1] || "0", 10) ||
      0;
    const mentionsB =
      Number.parseInt(b.description.match(/Mentions: (\d+)/)?.[1] || "0", 10) ||
      0;
    return mentionsB - mentionsA;
  });

  return applyCoordinateJitter(events);
}

/** Fetch GDELT DOC API articles and convert to NewsEvent[] */
export function parseGdeltArticles(articlesJson: GdeltArticle[]): NewsEvent[] {
  return articlesJson.map((art, i) => {
    const category = refineCategory(art.title, art.domain, "news");
    return {
      id: `gdelt-art-${i}-${Date.now()}`,
      title: art.title,
      description: `Published by ${art.domain} (${art.sourcecountry || "Unknown"})`,
      source: art.domain,
      category,
      publishedAt: gdeltSeenDateToISO(art.seendate),
      locationName: art.sourcecountry || "Global",
      // DOC API doesn't include coords, set to 0 — filter out in caller
      lat: 0,
      lng: 0,
      intensity: 0.6,
      url: art.url,
      socialImage: art.socialimage,
      articleUrl: art.url,
    } as NewsEvent & { socialImage?: string; articleUrl?: string };
  });
}

export interface GdeltArticle {
  url: string;
  url_mobile: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

function gdeltSeenDateToISO(seendate: string): string {
  // Format: YYYYMMDDTHHMMSSZ
  if (!seendate || seendate.length < 15) return new Date().toISOString();
  const y = seendate.substring(0, 4);
  const m = seendate.substring(4, 6);
  const d = seendate.substring(6, 8);
  const h = seendate.substring(9, 11);
  const min = seendate.substring(11, 13);
  const s = seendate.substring(13, 15);
  return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`).toISOString();
}

// ── GDELT URL builders ──

export const GDELT_LASTUPDATE_URL =
  "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

export function buildDocApiUrl(
  query: string,
  maxrecords = 75,
  timespan = "24h",
): string {
  return `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${maxrecords}&format=json&timespan=${timespan}&sourcelang=english`;
}
