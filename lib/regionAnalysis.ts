/**
 * Extractive strategic analysis for RegionWindow.
 *
 * This replaces a set of four hardcoded prose templates. Those produced the
 * same three paragraphs for every disaster region on earth, and — worse —
 * asserted things no article had said ("armed forces engineering battalions
 * deployed"). For a news product that is not styling, it is fabrication.
 *
 * Everything below is derived from the dispatches themselves. When the corpus
 * does not support a claim the pillar is null and the panel omits it, rather
 * than padding with filler.
 */
import type { NewsCategory, NewsEvent } from "@/types/news";

export interface ThreatVector {
  label: string;
  pct: number;
  category: NewsCategory;
}

export interface AnalysisPillars {
  impactAssessment: string | null;
  operationalDynamics: string | null;
  escalationOutlook: string | null;
  threatBreakdown: ThreatVector[];
  flashpoints: string[];
}

/** A figure a dispatch actually reported, e.g. "955 killed". */
export interface Metric {
  value: number;
  text: string;
}

// Up to two lowercase filler words between figure and noun, so "2,300 are
// injured" lands. Lowercase-only stops a match jumping into the next clause.
const FIGURE =
  /\b(\d[\d,]*)\s*(?:\+|plus)?\s*(?:[a-z]{1,10}\s+){0,2}(killed|dead|deaths|fatalities|casualties|missing|injured|wounded|displaced|evacuated|rescued|stranded|trapped|affected|arrested|detained|homes destroyed|houses damaged|hectares)\b/gi;
/** "death toll ... rose to 955" — the number trails the noun here. */
const TOLL = /\b(?:death toll|toll)\b[^.]{0,40}?\b(\d[\d,]*)\b/gi;

export function extractMetrics(events: NewsEvent[]): Metric[] {
  const best = new Map<string, Metric>();
  for (const e of events) {
    const text = `${e.title}. ${e.description}`;
    for (const m of text.matchAll(FIGURE)) {
      const value = Number.parseInt(m[1].replace(/,/g, ""), 10);
      if (!Number.isFinite(value) || value === 0) continue;
      const noun = m[2].toLowerCase();
      // Keep the highest figure per noun — tolls are revised upward and the
      // stalest dispatch should not win.
      const prev = best.get(noun);
      if (!prev || value > prev.value) {
        best.set(noun, { value, text: `${value.toLocaleString()} ${noun}` });
      }
    }
    for (const m of text.matchAll(TOLL)) {
      const value = Number.parseInt(m[1].replace(/,/g, ""), 10);
      if (!Number.isFinite(value) || value < 2) continue;
      const prev = best.get("dead");
      if (!prev || value > prev.value) {
        best.set("dead", { value, text: `${value.toLocaleString()} dead` });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.value - a.value).slice(0, 4);
}

// Words that start a headline clause but are never part of an organisation.
const NOT_ENTITY = new Set([
  "the",
  "a",
  "an",
  "and",
  "but",
  "after",
  "before",
  "amid",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "over",
  "to",
  "with",
  "says",
  "said",
  "new",
  "live",
  "breaking",
  "update",
  "updates",
  "report",
  "reports",
  "watch",
  "video",
  "photos",
  "opinion",
  "analysis",
  "exclusive",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

/**
 * Multi-word proper nouns the dispatches name — agencies, officials, bodies.
 * Purely positional: capitalised runs of 2-4 words, ranked by how many separate
 * dispatches mention them. No dictionary of organisations.
 */
export function extractNamedEntities(
  events: NewsEvent[],
  exclude: string,
): string[] {
  const counts = new Map<string, number>();
  const excl = exclude.toLowerCase();
  for (const e of events) {
    const seen = new Set<string>();
    // Sentence-case body copy only: a Title Case headline capitalises
    // everything and would make every word look like a proper noun.
    for (const sentence of `${e.description}`.split(/(?<=[.!?])\s+/)) {
      const words = sentence.split(/\s+/);
      let run: string[] = [];
      const flush = () => {
        if (run.length >= 2) {
          const phrase = run.join(" ").replace(/[^\w\s'-]/g, "");
          const low = phrase.toLowerCase();
          // All-caps runs are datelines ("KOHIMA AUG"), not organisations.
          const allCaps = phrase === phrase.toUpperCase();
          if (
            !allCaps &&
            phrase.length >= 6 &&
            low !== excl &&
            !low.includes(excl) &&
            !excl.includes(low)
          ) {
            seen.add(phrase);
          }
        }
        run = [];
      };
      for (let i = 0; i < words.length; i++) {
        const raw = words[i].replace(/[^\w'-]/g, "");
        const low = raw.toLowerCase();
        const isCap = /^[\p{Lu}][\p{L}'-]+$/u.test(raw);
        // Skip the first word of a sentence: capitalisation there is grammar.
        if (isCap && !(i === 0) && !NOT_ENTITY.has(low)) {
          run.push(raw);
          if (run.length === 4) flush();
        } else {
          flush();
        }
      }
      flush();
    }
    for (const s of seen) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  // Corroboration filter: a name must appear in at least two separate
  // dispatches. Without it a single music review contributed "Post Malone" and
  // "Boys Like Girls" to a regional threat panel — accurate, but noise.
  const ranked = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([s]) => s);

  // The n-gram scan emits overlapping windows of one name, so a single person
  // arrived as "Chief Minister Himanta Biswa", "Himanta Biswa Sarma" and
  // "Chief Minister". Keep the longest form and drop anything contained in it.
  const kept: string[] = [];
  for (const cand of ranked) {
    const low = cand.toLowerCase();
    if (
      kept.some(
        (k) => k.toLowerCase().includes(low) || low.includes(k.toLowerCase()),
      )
    ) {
      continue;
    }
    kept.push(cand);
    if (kept.length === 5) break;
  }
  return kept;
}

/**
 * Feeds occasionally carry a garbage pubDate (epoch, or far future). One of
 * those stretched a Guwahati window to "the past 2965d" and put 1 dispatch in
 * the first half and 32 in the second. Keep only plausible timestamps.
 */
export function usableTimes(events: NewsEvent[]): number[] {
  const now = Date.now();
  const floor = now - 45 * 86_400_000;
  const ceiling = now + 86_400_000;
  return events
    .map((e) => new Date(e.publishedAt).getTime())
    .filter((t) => Number.isFinite(t) && t >= floor && t <= ceiling)
    .sort((a, b) => a - b);
}

function humanGap(ms: number): string {
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Comma-only join, for when the caller appends its own trailing clause. */
export function commaList(items: string[]): string {
  return items.join(", ");
}

/**
 * Build the three pillars from the dispatches. Any pillar the corpus cannot
 * support comes back null so the panel can drop it.
 */
export function buildAnalysis(
  events: NewsEvent[],
  placeName: string,
  threatBreakdown: ThreatVector[],
  flashpoints: string[],
): AnalysisPillars {
  if (!events.length) {
    return {
      impactAssessment: null,
      operationalDynamics: null,
      escalationOutlook: null,
      threatBreakdown,
      flashpoints,
    };
  }

  const place = placeName.trim() || "this area";
  const metrics = extractMetrics(events);
  const entities = extractNamedEntities(events, place);
  const sources = new Set(events.map((e) => e.source)).size;
  const times = usableTimes(events);
  const now = Date.now();
  const newest = times[times.length - 1] ?? now;
  const oldest = times[0] ?? now;
  const lead = threatBreakdown[0];

  // ── Impact: what the dispatches actually report ──
  const impactBits: string[] = [];
  impactBits.push(
    `${events.length} ${events.length === 1 ? "dispatch" : "dispatches"} from ${sources} ${sources === 1 ? "outlet" : "outlets"} over the past ${humanGap(newest - oldest || 3_600_000)}`,
  );
  if (lead) {
    impactBits.push(
      `led by ${lead.label.toLowerCase()} coverage at ${lead.pct}%`,
    );
  }
  let impact = `${place}: ${impactBits.join(", ")}.`;
  if (metrics.length) {
    impact += ` Figures reported: ${list(metrics.map((m) => m.text))}.`;
  }
  if (flashpoints.length) {
    impact += ` Datelines: ${list(flashpoints.slice(0, 3))}.`;
  }

  // ── Operations: only what is actually named ──
  const operational = entities.length
    ? `Named in coverage: ${list(entities.slice(0, 4))}.`
    : null;

  // ── Trajectory: reporting cadence, measured not predicted ──
  const halfway = oldest + (newest - oldest) / 2;
  const recent = times.filter((t) => t >= halfway).length;
  const earlier = times.length - recent;
  const trend =
    times.length < 4 || newest === oldest
      ? "too few dispatches to establish a trend"
      : recent > earlier * 1.5
        ? "reporting is accelerating"
        : earlier > recent * 1.5
          ? "reporting is tailing off"
          : "reporting is steady";
  const outlook = `Last dispatch ${humanGap(now - newest)} ago; ${trend} (${earlier} then ${recent} in the second half of the window).`;

  return {
    impactAssessment: impact,
    operationalDynamics: operational,
    escalationOutlook: outlook,
    threatBreakdown,
    flashpoints,
  };
}
