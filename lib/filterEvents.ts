import type { NewsCategory, NewsEvent, TimeRange } from "@/types/news";

function msAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3_600_000);
}

export function filterEvents(
  events: NewsEvent[],
  activeLayers: NewsCategory[],
  timeRange: TimeRange,
): NewsEvent[] {
  // Filter by category
  let filtered = events.filter((e) => activeLayers.includes(e.category));

  // Filter by time range
  let hours = 0;
  if (timeRange === "1h") hours = 1;
  else if (timeRange === "6h") hours = 6;
  else if (timeRange === "24h") hours = 24;
  else if (timeRange === "7d") hours = 24 * 7;

  if (hours > 0) {
    const cutoff = msAgo(hours);
    filtered = filtered.filter((e) => new Date(e.publishedAt) >= cutoff);
  }

  return filtered;
}

export function labelForTimeRange(range: TimeRange): string {
  switch (range) {
    case "all":
      return "All History";
    case "1h":
      return "Last Hour";
    case "6h":
      return "Last 6 Hours";
    case "24h":
      return "Last 24 Hours";
    case "7d":
      return "Last 7 Days";
  }
}

export function labelForCategory(cat: NewsCategory): string {
  switch (cat) {
    case "news":
      return "News";
    case "conflict":
      return "Conflict";
    case "disaster":
      return "Disaster";
    case "health":
      return "Health";
    case "space":
      return "Space";
  }
}
