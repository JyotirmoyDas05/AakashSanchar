/**
 * Regression checks for cluster -> RegionWindow event aggregation.
 * Run: pnpm exec tsx lib/regionAggregate.test.ts
 */
import assert from "node:assert/strict";
import type { NewsEvent } from "../types/news";
import {
  aggregateRegionalEvents,
  mostSpecificPlaceName,
  placeParts,
} from "./regionAggregate";

let n = 0;
const ev = (locationName: string, lat: number, lng: number): NewsEvent => {
  n++;
  return {
    id: `e${n}`,
    title: "Dispatch",
    description: "",
    source: "Wire",
    category: "news",
    tag: "General",
    publishedAt: new Date().toISOString(),
    locationName,
    lat,
    lng,
    intensity: 0.5,
  };
};

const countryOf = (e: NewsEvent) =>
  e.locationName.split(",").pop()?.trim() ?? "";

// A Kathmandu cluster, and a feed dominated by nearby Indian cities. A
// 5-degree box around Kathmandu covers the whole Indo-Gangetic plain.
const nepal = [
  ev("Kathmandu, Bagmati, Nepal", 27.7172, 85.324),
  ev("Pokhara, Gandaki, Nepal", 28.2096, 83.9856),
  ev("Biratnagar, Koshi, Nepal", 26.4525, 87.2718),
];
const indiaNearby = Array.from({ length: 40 }, (_, i) =>
  ev("Patna, Bihar, India", 25.5941 + i * 0.02, 85.1376),
);
const indiaFar = [ev("Mumbai, Maharashtra, India", 19.076, 72.8777)];
const all = [...indiaNearby, ...nepal, ...indiaFar];

// --- The reported bug: clicking a Nepali cluster opened an INDIA window ---
{
  const out = aggregateRegionalEvents(nepal, all, null);
  const countries = new Set(out.map(countryOf));
  assert.deepEqual(
    [...countries],
    ["Nepal"],
    `aggregation crossed the border: ${[...countries].join(", ")}`,
  );
  // The modal country is what names the window; it must still be Nepal.
  const counts = new Map<string, number>();
  for (const e of out)
    counts.set(countryOf(e), (counts.get(countryOf(e)) ?? 0) + 1);
  const modal = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(modal, "Nepal");
}

// --- Same-country neighbours are still pulled in for context ---
{
  const patnaCluster = [indiaNearby[0]];
  const out = aggregateRegionalEvents(patnaCluster, all, null);
  assert.ok(
    out.length > 1,
    "nearby same-country events should still aggregate for context",
  );
  assert.ok(
    out.every((e) => countryOf(e) === "India"),
    "but only same-country ones",
  );
  assert.ok(
    !out.some((e) => e.locationName.startsWith("Mumbai")),
    "and only nearby ones — Mumbai is 1,500 km away",
  );
}

// --- Array order must not decide what the window is about ---
{
  // One stray Indian report sorted first inside an otherwise Nepali cluster.
  const mixed = [indiaFar[0], ...nepal];
  const out = aggregateRegionalEvents(mixed, all, null);
  const counts = new Map<string, number>();
  for (const e of out)
    counts.set(countryOf(e), (counts.get(countryOf(e)) ?? 0) + 1);
  const modal = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(
    modal,
    "Nepal",
    "the leading element must not hijack the region",
  );
}

// --- An active search is already filtered; leave it alone ---
{
  const out = aggregateRegionalEvents(nepal, all, "nepal");
  assert.equal(out.length, nepal.length);
}

// --- placeParts: a two-part name is a state, not a city ---
{
  const p3 = placeParts(ev("Guwahati, Assam, India", 26.18, 91.75));
  assert.deepEqual(p3, { city: "Guwahati", admin1: "Assam", country: "India" });
  const p2 = placeParts(ev("Assam, India", 26.35, 92.64));
  assert.deepEqual(p2, { city: "", admin1: "Assam", country: "India" });
  const p1 = placeParts(ev("Nepal", 27.64, 84.7));
  assert.deepEqual(p1, { city: "", admin1: "", country: "Nepal" });
}

// --- The reported bug: a Guwahati cluster titled itself INDIA ---
{
  const guwahati = Array.from({ length: 40 }, () =>
    ev("Guwahati, Assam, India", 26.1844, 91.7458),
  );
  assert.equal(mostSpecificPlaceName(guwahati), "Guwahati");

  // Spread across the state -> the state, still not the country.
  const acrossAssam = [
    ...guwahati,
    ev("Silchar, Assam, India", 24.82, 92.79),
    ev("Dibrugarh, Assam, India", 27.47, 94.9),
  ];
  assert.equal(mostSpecificPlaceName(acrossAssam), "Assam");

  // Genuinely national spread -> the country is the honest answer.
  assert.equal(
    mostSpecificPlaceName([
      ...guwahati,
      ev("Mumbai, Maharashtra, India", 19.07, 72.87),
    ]),
    "India",
  );
}

// --- Aggregation stays inside the state, not just inside the country ---
{
  const guwahati = [ev("Guwahati, Assam, India", 26.1844, 91.7458)];
  const pool = [
    ...guwahati,
    ev("Silchar, Assam, India", 24.8273, 92.7979),
    // Same country, well within the old 5-degree box, different state.
    ev("Kolkata, West Bengal, India", 22.5726, 88.3639),
    ev("Shillong, Meghalaya, India", 25.5689, 91.8831),
  ];
  const out = aggregateRegionalEvents(guwahati, pool, null);
  const states = new Set(out.map((e) => placeParts(e).admin1));
  assert.deepEqual(
    [...states],
    ["Assam"],
    `aggregation leaked out of the state: ${[...states].join(", ")}`,
  );
  assert.equal(mostSpecificPlaceName(out), "Assam");
}

console.log("regionAggregate.ts: all checks passed");
