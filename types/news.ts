export type NewsCategory =
  | "politics"
  | "business"
  | "tech"
  | "sports"
  | "disaster"
  | "general";

export type TimeRange = "all" | "last24h" | "last7d";

export interface NewsEvent {
  id: string;
  title: string;
  source: string;
  category: NewsCategory;
  publishedAt: string;
  locationName: string;
  lat: number;
  lng: number;
  intensity: number;
}
