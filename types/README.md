# Type System: Contracts & Data Schemas

This directory defines TypeScript types and interfaces used throughout the application.

---

## Core Types

### NewsEvent (news.ts)

Single contract for all article sources (GDELT + RSS).

```typescript
type NewsEvent = GDELTEvent | RSSArticle

interface GDELTEvent {
  title: string
  source: "GDELT"
  category: EventCategory
  timestamp: Date
  latitude: number          // pre-geocoded
  longitude: number         // pre-geocoded
  intensity: number         // [0, 100] from Goldstein score
  eventCode: string         // CAMEO code (e.g., "020")
  goldsteinScore: number    // [-10, 10]
}

interface RSSArticle {
  title: string
  source: string            // outlet domain (e.g., "bbc.com")
  category: EventCategory
  timestamp: Date
  latitude: number | null   // geocoded from headline
  longitude: number | null  // geocoded from headline
  intensity: number         // [0, 100] from keywords
  geocoded: boolean         // true if lat/lng resolved
  geocodeConfidence: "HIGH" | "MEDIUM" | "LOW" | null
  originalUrl?: string
}

type EventCategory = 
  | "CONFLICT"
  | "DISASTER"
  | "HEALTH"
  | "SPACE"
  | "GENERAL"
```

**Why a union type?**
- Single interface handles both pipelines
- No duplicate code for filtering/rendering
- Type-safe discrimination: `if (event.source === "GDELT")`

**Example**: Both GDELT conflict event and RSS article headline resolve to same `NewsEvent` shape:

```typescript
// GDELT
{
  title: "Armed clashes in Arunachal Pradesh",
  source: "GDELT",
  category: "CONFLICT",
  latitude: 29.0,
  longitude: 93.5,
  intensity: 75,
  eventCode: "020",
  goldsteinScore: 7.5
}

// RSS
{
  title: "Armed clashes in Arunachal Pradesh",
  source: "bbc.com",
  category: "CONFLICT",
  latitude: 29.0,
  longitude: 93.5,
  intensity: 75,
  geocoded: true,
  geocodeConfidence: "HIGH"
}

// Both render the same way in map/panels
```

---

### Region & RegionDigest

```typescript
interface Region {
  name: string              // "Kashmir", "Delhi", "India", etc.
  type: "city" | "state" | "country"
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  population?: number
  country?: string          // ISO code for cities/states
}

interface RegionDigest {
  region: Region
  situationBrief: {
    headline: string        // "Summary of events"
    recentHeadlines: string[]
    totalCount: number
  }
  analysis: {
    threatLevel: ThreatLevel
    activityLevel: ActivityLevel
    topCategories: Array<{
      name: EventCategory
      count: number
    }>
    timelineEvents: Array<{
      timestamp: Date
      headline: string
      severity: number
    }>
  }
  precomputedAt: Date
}

type ThreatLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE"
type ActivityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
```

---

### Geocoding Response

```typescript
interface GeocodingResult {
  latitude: number | null
  longitude: number | null
  placeName?: string
  confidence: "HIGH" | "MEDIUM" | "LOW" | null
  debug?: {
    topCandidates: Array<{
      name: string
      score: number
      population?: number
    }>
    matchType: "multi-word" | "single" | "city" | "country"
  }
}
```

**Example**:

```typescript
const result = geocode("Monsoon floods devastate Arunachal Pradesh")
// {
//   latitude: 29.0,
//   longitude: 93.5,
//   placeName: "Arunachal Pradesh",
//   confidence: "HIGH",
//   debug: {
//     topCandidates: [
//       { name: "Arunachal Pradesh", score: 80, population: 1400000 },
//       { name: "Assam", score: 45 }
//     ],
//     matchType: "multi-word"
//   }
// }
```

---

### Search Types

```typescript
interface SearchQuery {
  term: string
  type?: "region" | "article" | "all"
  limit?: number            // max results (default: 10)
}

interface SearchResult {
  id: string                // unique identifier
  type: "region" | "article"
  name: string
  description?: string
  score: number             // [0, 100] match confidence
  metadata: any
}
```

**Example**:

```typescript
const results = search({ term: "Nepal", limit: 5 })
// [
//   {
//     type: "region",
//     name: "Nepal",
//     score: 100,
//     metadata: { bounds: {...}, population: 30M }
//   },
//   {
//     type: "article",
//     name: "Earthquake hits Nepal",
//     score: 85,
//     metadata: { source: "BBC", timestamp: ... }
//   }
// ]
```

---

### Filter Types

```typescript
interface EventFilter {
  categories?: EventCategory[]
  startDate?: Date
  endDate?: Date
  bbox?: {
    north: number
    south: number
    east: number
    west: number
  }
  region?: Region
  searchTerm?: string
  onlyGeocoded?: boolean    // exclude null coordinates
}
```

**Example**:

```typescript
const filtered = filterEvents(articles, {
  categories: ["CONFLICT", "DISASTER"],
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),  // last 24 hours
  region: kashmir,
  onlyGeocoded: true
})
```

---

### Outbreak Types

```typescript
interface OutbreakAlert {
  region: Region
  diseaseName: string
  articleCount: number
  severity: "MEDIUM" | "HIGH"
  recentArticles: NewsEvent[]
  detectedAt: Date
}
```

**Example**:

```typescript
const outbreaks = deriveOutbreaks(articles)
// [
//   {
//     region: { name: "Kerala", type: "state", ... },
//     diseaseName: "Dengue",
//     articleCount: 5,
//     severity: "MEDIUM",
//     recentArticles: [...]
//   }
// ]
```

---

### API Response Types

**GET /api/gdelt/articles**:

```typescript
interface ArticlesResponse {
  articles: NewsEvent[]
  totalCount: number
  geocodedCount: number
  successRate: number       // e.g., 0.77
  lastUpdate: Date
}
```

**GET /api/gdelt/events**:

```typescript
interface EventsResponse {
  gdeltEvents: NewsEvent[]
  cached: boolean
  lastUpdate: Date
}
```

---

## Type Hierarchy & Relationships

```
NewsEvent (base)
  ├── GDELTEvent
  │   └── uses: CAMEO code mapping
  └── RSSArticle
      └── uses: GeocodingResult

Region
  └── contains: RegionDigest
      └── contains: ThreatLevel, ActivityLevel
          └── references: NewsEvent[]

SearchQuery
  └── returns: SearchResult[]
      └── metadata: can reference Region or NewsEvent

EventFilter
  └── applies to: NewsEvent[]
      └── uses: Region, bbox, EventCategory[]
```

---

## Null/Undefined Handling

### Coordinates

RSS articles may have `null` coordinates if geocoding fails.

**Policy**: Never fabricate coordinates.

```typescript
// NEVER do this:
if (article.latitude === null) {
  article.latitude = region.bounds.center.lat  // WRONG!
}

// DO this:
if (article.latitude === null) {
  return null  // Honest; no marker
}
```

### Category

GDELT categories are precise (CAMEO-mapped).

RSS categories are inferred from keywords; may be "GENERAL" if ambiguous.

```typescript
const inferred = inferCategory(headline)
// "CONFLICT", "DISASTER", "HEALTH", "SPACE", or "GENERAL"
```

### Timestamps

All timestamps are `Date` objects in UTC.

```typescript
const articles = getArticles()
articles[0].timestamp instanceof Date  // true
articles[0].timestamp.getUTCHours()    // [0, 23]
```

---

## Validation Helpers

Defined in `news.ts`, these validate type contracts:

```typescript
function isNewsEvent(obj: any): obj is NewsEvent {
  return (
    typeof obj.title === 'string' &&
    typeof obj.latitude === 'number' || obj.latitude === null &&
    typeof obj.longitude === 'number' || obj.longitude === null &&
    ['CONFLICT', 'DISASTER', 'HEALTH', 'SPACE', 'GENERAL'].includes(obj.category) &&
    obj.timestamp instanceof Date &&
    typeof obj.intensity === 'number' &&
    obj.intensity >= 0 && obj.intensity <= 100
  )
}

// Usage
if (!isNewsEvent(obj)) throw new Error("Invalid NewsEvent")
```

---

## Type Safety Patterns

### Discriminated Unions

```typescript
// Safe: TypeScript narrows type based on discriminator
function handleEvent(event: NewsEvent) {
  if (event.source === "GDELT") {
    console.log(event.eventCode)          // OK (GDELT only)
    console.log(event.geocodeConfidence)  // ERROR! (RSS only)
  } else {
    console.log(event.geocodeConfidence)  // OK (RSS only)
    console.log(event.eventCode)          // ERROR! (GDELT only)
  }
}
```

### Generic Filters

```typescript
function filterByCategory<T extends NewsEvent>(
  events: T[],
  categories: EventCategory[]
): T[] {
  return events.filter(e => categories.includes(e.category))
}

const articles: RSSArticle[] = [...]
const filtered = filterByCategory(articles, ["CONFLICT"])
// filtered type: RSSArticle[] (type preserved)
```

---

## Common Type Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read property 'eventCode' of undefined` | Assumed RSS has eventCode | Use discriminator: `event.source === "GDELT"` |
| `latitude is number but expected number \| null` | RSS can have null coords | Check: `if (article.latitude !== null)` |
| `Region.name expects string` | Region might be undefined | Use optional chaining: `region?.name` |
| `EventCategory is not assignable to "CONFLICT" \| "DISASTER" ...` | Invalid category string | Use enum or literal type validation |

---

## References

- [Data Layer: See app/api/README.md](../app/api/README.md)
- [Logic Layer: See lib/README.md](../lib/README.md)
- [Presentation Layer: See components/README.md](../components/README.md)
- [TypeScript Handbook: Union Types](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html)
- [TypeScript Handbook: Discriminated Unions](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#discriminating-unions)
