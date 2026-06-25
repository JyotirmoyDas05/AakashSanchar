export type NewsCategory =
  | "breaking"
  | "protests"
  | "disasters"
  | "politics"
  | "economy"
  | "tech";

export type TimeRange = "1h" | "6h" | "24h" | "7d" | "all";

export interface NewsEvent {
  id: string;
  title: string;
  description: string;
  source: string;
  category: NewsCategory;
  publishedAt: string;
  locationName: string;
  lat: number;
  lng: number;
  intensity: number;
}
