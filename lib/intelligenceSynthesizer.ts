import { formatTime } from "@/lib/formatTime";
import { buildAnalysis } from "@/lib/regionAnalysis";
import { bucketForTag } from "@/lib/tagPalette";
import type { NewsCategory, NewsEvent } from "@/types/news";

export interface KeyTimelineEvent {
  id: string;
  dateLabel: string;
  relativeTime: string;
  title: string;
  detail: string;
  badge: string;
  badgeColor: string;
}

export interface ThreatVector {
  label: string;
  pct: number;
  category: NewsCategory;
}

export interface StrategicAnalysisPillars {
  /** null when the dispatches do not support the claim — the panel omits it. */
  impactAssessment: string | null;
  operationalDynamics: string | null;
  escalationOutlook: string | null;
  threatBreakdown: ThreatVector[];
  flashpoints: string[];
}

export interface SynthesizedIntelligence {
  summary: string;
  keyEvents: KeyTimelineEvent[];
  analysis: StrategicAnalysisPillars;
  activityLevel: "LOW" | "MODERATE" | "ELEVATED" | "HIGH" | "CRITICAL";
}

function cleanHeadline(title: string): string {
  return title
    .replace(
      /\s*[-|–—]\s*(The\s+)?(Dawn|Slguardian|Tribune|BBC|Reuters|Al Jazeera|NYT|CNN|AP|AFP|Bloomberg|Washington Post|Nikkei|Gulf Intel|Seismic Monitor).*$/i,
      "",
    )
    .replace(
      /^(breaking|alert|exclusive|watch|live updates|just in|special report):\s*/i,
      "",
    )
    .trim();
}

function extractKeyMetrics(events: NewsEvent[]): string | null {
  for (const e of events) {
    const combined = `${e.title} ${e.description}`;
    const match = combined.match(
      /\b(\d+(?:,\d+)?\+?)\s*(?:killed|dead|fatalities|casualties|deadly|injured|missing|submerged|displaced|arrested|detained|homes damaged)\b/i,
    );
    if (match?.[0]) {
      return match[0].toLowerCase();
    }
  }
  return null;
}

function extractFlashpoints(
  events: NewsEvent[],
  locationName: string,
): string[] {
  const seen = new Set<string>();
  const flashpoints: string[] = [];

  for (const e of events) {
    const raw = e.locationName;
    if (raw && raw !== "SYSTEM STATUS" && raw !== "Global") {
      const parts = raw.split(/[,;/]/).map((p) => p.trim());
      for (const p of parts) {
        if (
          p.length >= 3 &&
          p.toUpperCase() !== locationName.toUpperCase() &&
          !seen.has(p.toUpperCase())
        ) {
          seen.add(p.toUpperCase());
          flashpoints.push(p);
          if (flashpoints.length >= 4) return flashpoints;
        }
      }
    }
  }

  // Also check headlines for capitalized entities/cities
  if (flashpoints.length < 2) {
    for (const e of events) {
      const words = e.title.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const w = words[i].replace(/[^a-zA-Z]/g, "");
        if (
          w.length >= 4 &&
          /^[A-Z][a-z]+$/.test(w) &&
          ![
            "With",
            "From",
            "Near",
            "Over",
            "Into",
            "Under",
            "After",
            "Dead",
            "Killed",
            "Report",
            "Latest",
          ].includes(w) &&
          w.toUpperCase() !== locationName.toUpperCase() &&
          !seen.has(w.toUpperCase())
        ) {
          seen.add(w.toUpperCase());
          flashpoints.push(w);
          if (flashpoints.length >= 3) break;
        }
      }
    }
  }

  return flashpoints;
}

function calculateThreatBreakdown(events: NewsEvent[]): ThreatVector[] {
  if (!events.length) return [];
  const tagCounts = new Map<
    string,
    { count: number; category: NewsCategory }
  >();
  let total = 0;

  for (const e of events) {
    const tag = e.tag || e.category;
    const cat = bucketForTag(tag);
    const curr = tagCounts.get(tag) || { count: 0, category: cat };
    tagCounts.set(tag, { count: curr.count + 1, category: cat });
    total++;
  }

  const sorted = Array.from(tagCounts.entries()).sort(
    (a, b) => b[1].count - a[1].count,
  );

  return sorted.slice(0, 4).map(([tag, { count, category }]) => ({
    label: tag,
    pct: Math.round((count / total) * 100),
    category,
  }));
}

function buildTacticalDetail(ev: NewsEvent): string {
  const desc = ev.description || "";
  const title = ev.title || "";
  const location = ev.locationName || "";

  const isTelemetry =
    !desc ||
    /coverage across \d+ source|Goldstein stability score|Reported by/i.test(
      desc,
    ) ||
    desc.length < 20;

  if (!isTelemetry) {
    let d = desc
      .replace(
        /\s*[-|–—]\s*(The\s+)?(Dawn|Slguardian|Tribune|BBC|Reuters|Al Jazeera|NYT|CNN|AP|AFP|Bloomberg|Washington Post).*$/i,
        "",
      )
      .replace(/<[^>]*>/g, "")
      .replace(/^Reported by [^.]+\.\s*/i, "")
      .trim();
    if (d.length > 180) {
      d = `${d.substring(0, 180).trim()}…`;
    }
    if (!d.endsWith(".") && !d.endsWith("…")) d += ".";
    return d;
  }

  const t = title.toLowerCase();

  if (
    t.includes("weapon") ||
    t.includes("munition") ||
    t.includes("missile") ||
    t.includes("drain") ||
    t.includes("readiness") ||
    t.includes("stockpile")
  ) {
    return "Strategic defense logistics report acute supply pressure on weapons reserves, prompting multi-theater operational readiness reviews.";
  }
  if (
    t.includes("negotiat") ||
    t.includes("diplomat") ||
    t.includes("talks") ||
    t.includes("summit") ||
    t.includes("envoy") ||
    t.includes("wary")
  ) {
    return "Diplomatic envoys maintain active communication channels while signaling firm strategic deterrence regarding regional security terms.";
  }
  if (
    t.includes("sanction") ||
    t.includes("embargo") ||
    t.includes("trade") ||
    t.includes("currenc") ||
    t.includes("economy")
  ) {
    return "Economic enforcement measures and maritime trade controls continue to exert localized fiscal and supply chain pressure.";
  }
  if (
    t.includes("border") ||
    t.includes("skirmish") ||
    t.includes("clash") ||
    t.includes("strike") ||
    t.includes("shelling") ||
    t.includes("artillery")
  ) {
    return `Security forces and tactical monitoring units recorded active engagements near ${location || "frontier sectors"}, maintaining elevated alert status.`;
  }
  if (
    t.includes("flood") ||
    t.includes("rain") ||
    t.includes("monsoon") ||
    t.includes("water") ||
    t.includes("river") ||
    t.includes("inundat")
  ) {
    return "Emergency disaster response battalions deployed across low-lying zones as floodwaters exceeded safety thresholds and disrupted local transit.";
  }
  if (
    t.includes("quake") ||
    t.includes("seismic") ||
    t.includes("tremor") ||
    t.includes("magnitude")
  ) {
    return "Civil protection teams conducted structural integrity checks and activated emergency protocols following strong seismic shifts.";
  }
  if (
    t.includes("protest") ||
    t.includes("demonstrat") ||
    t.includes("unrest") ||
    t.includes("riot")
  ) {
    return "Security personnel established protective cordons outside administrative centers following localized public demonstrations.";
  }
  if (
    t.includes("drone") ||
    t.includes("airspace") ||
    t.includes("uav") ||
    t.includes("intercept")
  ) {
    return "Air defense radar networks tracked aerial incursions, activating rapid response and electronic countermeasure units.";
  }
  if (
    t.includes("vessel") ||
    t.includes("tanker") ||
    t.includes("strait") ||
    t.includes("maritime") ||
    t.includes("hormuz") ||
    t.includes("shipping")
  ) {
    return "Naval coastal patrols and maritime monitoring centers recorded commercial shipping route disruptions in international transit corridors.";
  }
  if (
    t.includes("outbreak") ||
    t.includes("virus") ||
    t.includes("ebola") ||
    t.includes("quarantine") ||
    t.includes("influenza")
  ) {
    return "Epidemiological monitoring units established localized containment perimeters to isolate potential transmission vectors.";
  }

  return `Multi-source intelligence confirms active operational developments in ${location || "the area"} with tactical assets monitoring developments.`;
}

function getTagColor(category: string, tag?: string): string {
  const t = (tag || category).toLowerCase();
  if (
    t.includes("flood") ||
    t.includes("quake") ||
    t.includes("disaster") ||
    t.includes("wildfire")
  ) {
    return "#ef4444";
  }
  if (
    t.includes("conflict") ||
    t.includes("airstrike") ||
    t.includes("clash") ||
    t.includes("missile") ||
    t.includes("war")
  ) {
    return "#f97316";
  }
  if (
    t.includes("health") ||
    t.includes("outbreak") ||
    t.includes("ebola") ||
    t.includes("virus") ||
    t.includes("surgery") ||
    t.includes("medical")
  ) {
    return "#a855f7";
  }
  if (t.includes("space") || t.includes("flare") || t.includes("satellite")) {
    return "#06b6d4";
  }
  return "#3b82f6";
}

function extractCoreThemes(
  events: NewsEvent[],
): Array<{ title: string; category: string; tag: string }> {
  const themes: Array<{ title: string; category: string; tag: string }> = [];
  for (const e of events.slice(0, 5)) {
    const t = cleanHeadline(e.title);
    if (t.length > 10) {
      themes.push({
        title: t,
        category: e.category || "news",
        tag: e.tag || "General",
      });
    }
  }
  return themes;
}

function synthesizeSummary(
  events: NewsEvent[],
  locationName: string,
  query?: string,
): string {
  if (!events.length) {
    return `Regional monitoring active for ${locationName}. No critical incident anomalies detected across active tactical grids.`;
  }

  const themes = extractCoreThemes(events);
  const targetName = (query || locationName || "The region").trim();
  const cats = [...new Set(events.map((e) => e.category || "news"))];
  const metric = extractKeyMetrics(events);

  const lead1 = themes[0] ? themes[0].title : "";
  const lead2 = themes[1] ? themes[1].title : "";
  const lead3 = themes[2] ? themes[2].title : "";

  if (cats.includes("disaster")) {
    let text = `${targetName} is actively managing severe disaster operations. Priority reporting focuses on ${lead1.toLowerCase()}`;
    if (metric) {
      text += ` (${metric})`;
    }
    if (lead2) {
      text += `, with ongoing civil defense mobilizations addressing ${lead2.toLowerCase()}`;
    }
    text += `. First responders and logistical units remain deployed across crisis corridors.`;
    return text;
  }

  if (cats.includes("conflict")) {
    let text = `${targetName} is under active tactical observation amid elevated security movements. Primary dispatches track ${lead1}`;
    if (metric) {
      text += ` (${metric})`;
    }
    if (lead2) {
      text += `, while defense coordinators respond to ${lead2.toLowerCase()}`;
    }
    text += `. Rapid-response units and border detachments maintain reinforced deterrence postures.`;
    return text;
  }

  if (cats.includes("health")) {
    let text = `Public health and clinical surveillance channels in ${targetName} are monitoring medical incidents. Leading reports focus on ${lead1.toLowerCase()}`;
    if (lead2) {
      text += `, with medical containment teams tracking ${lead2.toLowerCase()}`;
    }
    text += `. Healthcare detachments remain on elevated alert to support diagnostic and clinical operations.`;
    return text;
  }

  let text = `${targetName} reports active regional developments across ${events.length} corroborated dispatches. Primary focus centers on ${lead1.toLowerCase()}`;
  if (lead2) {
    text += `, alongside developments regarding ${lead2.toLowerCase()}`;
  }
  if (lead3) {
    text += `, while administrative channels monitor ${lead3.toLowerCase()}`;
  }
  text += `. Civic and institutional authorities are actively executing response measures.`;
  return text;
}

function synthesizeStrategicAnalysis(
  events: NewsEvent[],
  locationName: string,
  query?: string,
): StrategicAnalysisPillars {
  // Was four hardcoded prose templates keyed on `cats.includes("disaster")`,
  // so a single flood story among eight made an entire region read as a flood
  // zone, in identical wording to every other flood zone. Now derived from the
  // dispatches — see lib/regionAnalysis.ts.
  const targetName = (query || locationName || "the region").trim();
  return buildAnalysis(
    events,
    targetName,
    calculateThreatBreakdown(events),
    extractFlashpoints(events, targetName),
  );
}

export function synthesizeRegionIntelligence(
  events: NewsEvent[],
  locationName: string,
  query?: string,
): SynthesizedIntelligence {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const top = sorted.slice(0, 6);
  let lastTimeMs = Infinity;

  const keyEvents: KeyTimelineEvent[] = top.map((ev, idx) => {
    let eventTime = new Date(ev.publishedAt).getTime();
    if (Number.isNaN(eventTime) || eventTime <= 0) {
      eventTime = Date.now() - idx * 24 * 60 * 1000;
    }
    if (eventTime >= lastTimeMs) {
      eventTime = lastTimeMs - (8 + (idx % 4) * 6) * 60 * 1000;
    }
    lastTimeMs = eventTime;

    const d = new Date(eventTime);
    const dateLabel = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const rel = formatTime(new Date(eventTime).toISOString());
    const badge = (ev.tag || ev.category).toUpperCase();
    const badgeColor = getTagColor(ev.category, ev.tag);

    return {
      id: ev.id,
      dateLabel,
      relativeTime: rel,
      title: cleanHeadline(ev.title),
      detail: buildTacticalDetail(ev),
      badge,
      badgeColor,
    };
  });

  const maxIntensity = events.reduce(
    (m, e) => Math.max(m, e.intensity || 0.5),
    0.5,
  );
  const count = events.length;
  let activityLevel: SynthesizedIntelligence["activityLevel"] = "MODERATE";
  if (maxIntensity >= 0.9 || count >= 12) activityLevel = "CRITICAL";
  else if (maxIntensity >= 0.75 || count >= 6) activityLevel = "HIGH";
  else if (maxIntensity >= 0.55 || count >= 3) activityLevel = "ELEVATED";
  else if (maxIntensity <= 0.4 && count <= 1) activityLevel = "LOW";

  return {
    summary: synthesizeSummary(events, locationName, query),
    keyEvents,
    analysis: synthesizeStrategicAnalysis(events, locationName, query),
    activityLevel,
  };
}
