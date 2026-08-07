// Single source for tag → bucket → color. Keeps chip style minimal (same 5 bucket colors) while labels become diverse.
import type { NewsCategory } from "@/types/news";

export type TagBucket = NewsCategory;

export const BUCKET_COLOR: Record<NewsCategory, string> = {
  news: "#9ca3af",
  conflict: "#ef4444",
  disaster: "#f97316",
  health: "#a855f7",
  space: "#06b6d4",
};

export const BUCKET_TEXT_CLASS: Record<NewsCategory, string> = {
  news: "text-cat-news",
  conflict: "text-cat-conflict",
  disaster: "text-cat-disaster",
  health: "text-cat-health",
  space: "text-cat-space",
};

export const BUCKET_BG_CLASS: Record<NewsCategory, string> = {
  news: "bg-cat-news",
  conflict: "bg-cat-conflict",
  disaster: "bg-cat-disaster",
  health: "bg-cat-health",
  space: "bg-cat-space",
};

// Tag → bucket mapping is the source of truth for filtering.
// A tag's visual color is its bucket's color, so the UI stays minimal (5 colors).
export const TAG_TO_BUCKET: Record<string, NewsCategory> = {
  "Product Launch": "news",
  Cinema: "news",
  Sports: "news",
  "Market Gain": "news",
  "Market Rout": "news",
  Diplomacy: "news",
  Election: "news",
  Energy: "news",
  Rescue: "news",
  Judiciary: "news",
  Legal: "news",
  Governance: "news",
  General: "news",
  "Armed Clash": "conflict",
  Airstrike: "conflict",
  "Ceasefire Talks": "conflict",
  Flood: "disaster",
  Quake: "disaster",
  Cyclone: "disaster",
  Wildfire: "disaster",
  Outbreak: "health",
  Health: "health",
  Medical: "health",
  Surgery: "health",
  Space: "space",
};

export function bucketForTag(tag: string): NewsCategory {
  if (TAG_TO_BUCKET[tag]) return TAG_TO_BUCKET[tag];
  const t = tag.toLowerCase();
  if (
    t.includes("health") ||
    t.includes("medic") ||
    t.includes("surg") ||
    t.includes("doctor") ||
    t.includes("virus") ||
    t.includes("disease") ||
    t.includes("outbreak")
  ) {
    return "health";
  }
  if (
    t.includes("flood") ||
    t.includes("quake") ||
    t.includes("storm") ||
    t.includes("disaster") ||
    t.includes("cyclone") ||
    t.includes("fire") ||
    t.includes("landslide")
  ) {
    return "disaster";
  }
  if (
    t.includes("clash") ||
    t.includes("strike") ||
    t.includes("war") ||
    t.includes("milit") ||
    t.includes("attack") ||
    t.includes("combat") ||
    t.includes("bomb")
  ) {
    return "conflict";
  }
  if (
    t.includes("space") ||
    t.includes("orbit") ||
    t.includes("satell") ||
    t.includes("astro") ||
    t.includes("rocket")
  ) {
    return "space";
  }
  return "news";
}
