"use client";

import type { NewsCategory, TimeRange } from "@/types/news";

const CATEGORIES: (NewsCategory | "all")[] = [
  "all",
  "politics",
  "business",
  "tech",
  "sports",
  "disaster",
  "general",
];

const TIME_RANGES: TimeRange[] = ["all", "last24h", "last7d"];

function labelForCategory(cat: NewsCategory | "all"): string {
  if (cat === "all") return "All Categories";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function labelForTimeRange(range: TimeRange): string {
  switch (range) {
    case "all":
      return "All Time";
    case "last24h":
      return "Last 24 Hours";
    case "last7d":
      return "Last 7 Days";
  }
}

interface FilterBarProps {
  category: NewsCategory | "all";
  timeRange: TimeRange;
  onCategoryChange: (cat: NewsCategory | "all") => void;
  onTimeRangeChange: (range: TimeRange) => void;
}

export default function FilterBar({
  category,
  timeRange,
  onCategoryChange,
  onTimeRangeChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <select
        className="rounded-md border px-3 py-1.5 text-sm"
        value={category}
        onChange={(e) =>
          onCategoryChange(e.target.value as NewsCategory | "all")
        }
        aria-label="Filter by category"
      >
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {labelForCategory(cat)}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border px-3 py-1.5 text-sm"
        value={timeRange}
        onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
        aria-label="Filter by time range"
      >
        {TIME_RANGES.map((range) => (
          <option key={range} value={range}>
            {labelForTimeRange(range)}
          </option>
        ))}
      </select>
    </div>
  );
}
