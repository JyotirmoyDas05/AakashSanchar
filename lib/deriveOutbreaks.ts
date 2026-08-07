import type { NewsEvent } from "@/types/news";

export interface OutbreakSignal {
  id: string;
  pathogen: string;
  location: string;
  reports: number;
  lastSeen: string;
}

const PATHOGENS: { name: string; keywords: string[] }[] = [
  { name: "Ebola", keywords: ["ebola"] },
  { name: "Marburg", keywords: ["marburg"] },
  { name: "Lassa Fever", keywords: ["lassa"] },
  { name: "Hantavirus", keywords: ["hantavirus"] },
  {
    name: "Avian Influenza (H5N1)",
    keywords: ["h5n1", "avian influenza", "bird flu"],
  },
  { name: "Cholera", keywords: ["cholera"] },
  { name: "Dengue", keywords: ["dengue"] },
  { name: "Measles", keywords: ["measles"] },
  { name: "Mpox", keywords: ["mpox", "monkeypox"] },
  { name: "Nipah", keywords: ["nipah"] },
  { name: "Crimean-Congo", keywords: ["crimean-congo", "ccf"] },
  { name: "Yellow Fever", keywords: ["yellow fever"] },
  { name: "Polio", keywords: ["polio"] },
  { name: "COVID-19", keywords: ["covid"] },
];

// Derives live outbreak signals from the GDELT health-category event feed.
// It is real, news-driven data (matching world-monitor style aggregation),
// and fails safe: returns an empty list when nothing matches.
export function deriveOutbreaks(events: NewsEvent[]): OutbreakSignal[] {
  const health = events.filter((e) => e.category === "health");
  const map = new Map<string, OutbreakSignal>();

  for (const e of health) {
    const hay = `${e.title} ${e.description} ${e.source ?? ""}`.toLowerCase();
    for (const p of PATHOGENS) {
      if (p.keywords.some((k) => hay.includes(k))) {
        const key = `${p.name}|${e.locationName}`;
        const existing = map.get(key);
        if (existing) {
          existing.reports += 1;
          if (e.publishedAt > existing.lastSeen)
            existing.lastSeen = e.publishedAt;
        } else {
          map.set(key, {
            id: `ob-${map.size}`,
            pathogen: p.name,
            location: e.locationName,
            reports: 1,
            lastSeen: e.publishedAt,
          });
        }
        break;
      }
    }
  }

  return [...map.values()].sort((a, b) => b.reports - a.reports);
}
