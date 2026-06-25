import type { NewsCategory, NewsEvent, TimeRange } from "@/types/news";

function msAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3_600_000);
}

export function filterEvents(
  events: NewsEvent[],
  category: NewsCategory | "all",
  timeRange: TimeRange,
): NewsEvent[] {
  let filtered = events;

  if (category !== "all") {
    filtered = filtered.filter((e) => e.category === category);
  }

  if (timeRange === "last24h") {
    const cutoff = msAgo(24);
    filtered = filtered.filter((e) => new Date(e.publishedAt) >= cutoff);
  } else if (timeRange === "last7d") {
    const cutoff = msAgo(24 * 7);
    filtered = filtered.filter((e) => new Date(e.publishedAt) >= cutoff);
  }

  return filtered;
}

export function labelForTimeRange(range: TimeRange): string {
  switch (range) {
    case "all":
      return "All Time";
    case "last24h":
      return "Last 24 Hours";
    case "last7d":
      return "Last 7 Days";
  }
}

export function labelForCategory(cat: NewsCategory | "all"): string {
  if (cat === "all") return "All Categories";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}
