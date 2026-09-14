/**
 * Regression checks for the spatial entity search engine.
 * Run: pnpm exec tsx lib/search.test.ts
 */
import assert from "node:assert/strict";
import type { NewsEvent } from "../types/news";
import {
  calculateCoreSpatialCluster,
  extractDynamicEntities,
  searchAllEntities,
} from "./search";

let n = 0;
function ev(partial: Partial<NewsEvent> & { locationName: string }): NewsEvent {
  n++;
  return {
    id: `e${n}`,
    title: "Untitled dispatch",
    description: "",
    source: "Wire",
    category: "news",
    tag: "General",
    publishedAt: new Date().toISOString(),
    lat: 0,
    lng: 0,
    intensity: 0.5,
    ...partial,
  };
}

// --- Fix 3: every location segment is indexed, not just first + last ---
{
  const events = [
    ev({ locationName: "Guwahati, Assam, India", lat: 26.14, lng: 91.73 }),
    ev({ locationName: "Silchar, Assam, India", lat: 24.83, lng: 92.77 }),
    ev({ locationName: "Mumbai, Maharashtra, India", lat: 19.07, lng: 72.87 }),
  ];
  const { locations } = extractDynamicEntities(events);
  const byName = new Map(locations.map((l) => [l.name, l]));

  const assam = byName.get("Assam");
  assert.ok(assam, "admin-1 'Assam' must be indexed, not swallowed by India");
  assert.equal(assam.type, "region");
  assert.equal(assam.eventCount, 2, "Assam owns both Assam dispatches");

  assert.equal(byName.get("India")?.type, "country");
  assert.equal(byName.get("India")?.eventCount, 3);
  assert.equal(byName.get("Guwahati")?.type, "city");
  assert.ok(byName.get("Maharashtra"), "second admin-1 indexed too");

  // and it is reachable through the palette's search path
  const hit = searchAllEntities(events, "Assam").locations[0];
  assert.equal(hit?.name, "Assam");
  assert.equal(hit.fullName, "Assam, India");
}

// --- Fix 4: multi-token queries no longer require every token in one doc ---
{
  const events = [
    ev({
      locationName: "Tehran, Iran",
      title: "Iran expands enrichment site",
      lat: 35.7,
      lng: 51.4,
    }),
    ev({
      locationName: "Vienna, Austria",
      title: "Nuclear inspectors resume talks",
      lat: 48.2,
      lng: 16.4,
    }),
  ];
  const res = searchAllEntities(events, "iran nuclear");
  assert.ok(
    res.events.length > 0,
    "2-token query must not return empty just because no doc holds both",
  );
  // the doc matching on location outranks the one matching on title only
  assert.equal(res.events[0].locationName, "Tehran, Iran");
}

// --- Fix 4 guard: one common word can't drag in the corpus on long queries ---
{
  const events = [
    ev({
      locationName: "Kathmandu, Nepal",
      title: "Nepal monsoon floods kill dozens",
    }),
    ev({
      locationName: "Hamburg, Germany",
      title: "River floods disrupt rail",
    }),
  ];
  const res = searchAllEntities(events, "nepal monsoon floods");
  assert.equal(
    res.events.length,
    1,
    "3-token query needs >=2 tokens; the lone 'floods' match is dropped",
  );
  assert.equal(res.events[0].locationName, "Kathmandu, Nepal");
}

// --- Framing: the density cluster wins over distant wire mentions ---
{
  const nepal = [27.7, 28.2, 27.9, 28.4].map((lat, i) =>
    ev({ locationName: "Kathmandu, Nepal", lat, lng: 85.3 + i * 0.1 }),
  );
  const outliers = [
    ev({ locationName: "Geneva, Switzerland", lat: 46.2, lng: 6.1 }),
    ev({ locationName: "Washington, United States", lat: 38.9, lng: -77.0 }),
  ];
  const { centroid, coreEvents } = calculateCoreSpatialCluster([
    ...outliers,
    ...nepal,
  ]);
  assert.ok(centroid);
  assert.equal(coreEvents.length, 4, "the 4 Nepal points are the core");
  assert.ok(
    centroid[0] > 27 && centroid[0] < 29,
    `centroid lat ${centroid[0]} should sit over Nepal, not the Mediterranean`,
  );
  assert.ok(
    centroid[1] > 84 && centroid[1] < 86,
    `centroid lng ${centroid[1]}`,
  );
}

console.log("search.ts: all checks passed");
