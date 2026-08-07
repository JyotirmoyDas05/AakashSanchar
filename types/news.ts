export type NewsCategory =
  | "news"
  | "conflict"
  | "disaster"
  | "health"
  | "space";

export type TimeRange = "1h" | "6h" | "24h" | "7d" | "all";

export interface NewsEvent {
  id: string;
  title: string;
  description: string;
  source: string;
  category: NewsCategory; // bucket for filtering / URL compat (derived from tag)
  tag: string; // single dynamic topic chip, e.g. "Product Launch" | "Cinema" | "Rescue"
  publishedAt: string;
  locationName: string;
  lat: number;
  lng: number;
  intensity: number;
  url?: string;
  imageUrl?: string;
}
