/**
 * Per-location digests, precomputed server-side.
 *
 * Mirrors world-monitor's /api/signal-markers: one record per resolved place,
 * carrying its own narrative, so opening a region panel needs no work and no
 * network call. Ours is computed during the RSS refresh that already runs every
 * 15 minutes, which means no cron job, no database and no per-request cost —
 * it rides the cache the articles route already keeps.
 *
 * Server-only. The text here is deterministic and extractive; swap
 * `composeSummary`/`composeAnalysis` for a model call if you want fluency
 * (see the LLM seam at the bottom of this file).
 */
import {
  buildAnalysis,
  commaList,
  extractMetrics,
  extractNamedEntities,
  usableTimes,
} from "@/lib/regionAnalysis";
import type { NewsEvent } from "@/types/news";

export interface LocationDigest {
  /** Canonical resolved place, e.g. "Guwahati, Assam, India" — the join key. */
  locationName: string;
  lat: number;
  lng: number;
  /** Situation Brief: what is being reported here. */
  summary: string;
  /** Strategic Analysis: one narrative block, world-monitor style. */
  analysis: string;
  mentionCount: number;
  sourceCount: number;
  /** 1-5, matching world-monitor's scale. */
  intensity: number;
  firstSeenAt: string;
  lastMentionedAt: string;
  processedAt: string;
}

/** Minimum dispatches before a place is worth its own narrative. */
const MIN_DISPATCHES = 2;
/** Cap so one refresh cannot spend unbounded time composing. */
const MAX_LOCATIONS = 400;

function cleanHeadline(title: string): string {
  return title
    .replace(
      /\s*[-|–—]\s*[^-|–—]{0,40}(News|Times|Post|Express|Herald)\s*$/i,
      "",
    )
    .replace(
      /^(breaking|alert|exclusive|watch|live updates|just in|update)\s*:\s*/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function stripDateline(title: string, place: string): string {
  const low = place.toLowerCase();
  return title.replace(/^([\p{Lu}][\p{L}\s]{2,24}):\s*/u, (m, prefix) =>
    low.includes(String(prefix).trim().toLowerCase()) ? "" : m,
  );
}

function shortPlace(locationName: string): string {
  const parts = locationName.split(",").map((p) => p.trim());
  return parts.length >= 3 ? `${parts[0]}, ${parts[1]}` : locationName;
}

function ago(from: number, to: number): string {
  const h = (to - from) / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round((to - from) / 60_000))} minutes`;
  if (h < 48) return `${Math.round(h)} hours`;
  return `${Math.round(h / 24)} days`;
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Situation Brief. Leads with the dominant headline verbatim rather than
 * splicing a truncated fragment into a fixed sentence — the previous approach
 * produced things like "focuses on assam: 67-km pre, with ongoing civil
 * defense mobilizations".
 */
function composeSummary(events: NewsEvent[], locationName: string): string {
  const place = shortPlace(locationName);
  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  // Regional desks prefix their own dateline ("Assam: ..."), which duplicates
  // the place we prepend. Drop it when it repeats.
  const lead = stripDateline(cleanHeadline(sorted[0].title), place);
  const outlets = new Set(events.map((e) => e.source));
  const metrics = extractMetrics(events);

  const bits: string[] = [`${place}: ${lead}.`];

  const others = sorted
    .slice(1)
    .map((e) => stripDateline(cleanHeadline(e.title), place))
    .filter((t) => t.length > 15)
    .slice(0, 2);
  if (others.length) {
    bits.push(`Also filed: ${others.map((t) => `“${t}”`).join("; ")}.`);
  }
  if (metrics.length) {
    bits.push(`Figures cited: ${list(metrics.map((m) => m.text))}.`);
  }
  bits.push(
    `${events.length} ${events.length === 1 ? "dispatch" : "dispatches"} from ${outlets.size} ${outlets.size === 1 ? "outlet" : "outlets"}.`,
  );
  return bits.join(" ");
}

/**
 * Strategic Analysis as one narrative block (world-monitor renders a single
 * ANALYSIS paragraph rather than fixed pillars). Reuses the extractors so the
 * on-device fallback and the precomputed text agree on the facts.
 */
function composeAnalysis(events: NewsEvent[], locationName: string): string {
  const place = shortPlace(locationName);
  const pillars = buildAnalysis(events, place, [], []);
  const entities = extractNamedEntities(events, place);
  const parts: string[] = [];

  if (pillars.impactAssessment) parts.push(pillars.impactAssessment);
  if (entities.length) {
    parts.push(
      `Recurring across more than one dispatch: ${list(entities.slice(0, 4))}.`,
    );
  }
  if (pillars.escalationOutlook) parts.push(pillars.escalationOutlook);

  const outlets = [...new Set(events.map((e) => e.source))];
  if (outlets.length > 1) {
    parts.push(
      outlets.length > 3
        ? `Corroboration: ${outlets.length} independent outlets (${commaList(outlets.slice(0, 3))} and others).`
        : `Corroboration: ${outlets.length} independent outlets (${list(outlets)}).`,
    );
  } else {
    parts.push(
      `Single-source: everything here comes from ${outlets[0]}, so treat it as uncorroborated.`,
    );
  }
  return parts.join(" ");
}

/** 1-5, from how heavily and how recently the place is being reported on. */
function scoreIntensity(events: NewsEvent[], newest: number): number {
  const hoursSince = (Date.now() - newest) / 3_600_000;
  let score = 1;
  if (events.length >= 3) score = 2;
  if (events.length >= 6) score = 3;
  if (events.length >= 12) score = 4;
  if (events.length >= 25) score = 5;
  if (hoursSince > 24) score = Math.max(1, score - 1);
  if (hoursSince < 3 && events.length >= 3) score = Math.min(5, score + 1);
  return score;
}

/**
 * Group geocoded articles by resolved place and precompute each one's brief and
 * analysis. Called once per feed refresh, not once per panel open.
 */
export function buildLocationDigests(events: NewsEvent[]): LocationDigest[] {
  const groups = new Map<string, NewsEvent[]>();
  const add = (key: string, e: NewsEvent) => {
    const bucket = groups.get(key);
    if (bucket) bucket.push(e);
    else groups.set(key, [e]);
  };

  for (const e of events) {
    if (!e.locationName || e.locationName === "SYSTEM STATUS") continue;
    if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue;
    // Emit at every administrative level, because a region panel may be a city,
    // a state or a country depending on what the user clicked and how far the
    // aggregation reached. World-monitor sidesteps this by only ever showing
    // one location per panel; ours aggregates, so it needs all three keys.
    add(e.locationName, e);
    const parts = e.locationName
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const country = parts[parts.length - 1];
      const admin1 = parts[parts.length - 2];
      const admin1Key = `${admin1}, ${country}`;
      if (admin1Key !== e.locationName) add(admin1Key, e);
      if (country !== e.locationName) add(country, e);
    }
  }

  const digests: LocationDigest[] = [];
  const ranked = [...groups.entries()]
    .filter(([, v]) => v.length >= MIN_DISPATCHES)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_LOCATIONS);

  const processedAt = new Date().toISOString();
  for (const [locationName, group] of ranked) {
    const times = usableTimes(group);
    const oldest = times[0] ?? Date.now();
    const newest = times[times.length - 1] ?? Date.now();

    digests.push({
      locationName,
      lat: group[0].lat,
      lng: group[0].lng,
      summary: composeSummary(group, locationName),
      analysis: composeAnalysis(group, locationName),
      mentionCount: group.length,
      sourceCount: new Set(group.map((e) => e.source)).size,
      intensity: scoreIntensity(group, newest),
      firstSeenAt: new Date(oldest).toISOString(),
      lastMentionedAt: new Date(newest).toISOString(),
      processedAt,
    });
  }
  return digests;
}

/* ── LLM seam ───────────────────────────────────────────────────────────────
 * composeSummary/composeAnalysis are pure (NewsEvent[], string) -> string. To
 * get world-monitor's fluency, make buildLocationDigests async and replace the
 * two calls with one model call per location, feeding it the same group. The
 * grouping, scoring, caching and wiring below do not change.
 * `ago` is exported for that path's prompt construction.
 * ─────────────────────────────────────────────────────────────────────────── */
export const _internals = { ago, cleanHeadline, shortPlace };
