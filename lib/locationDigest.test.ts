/**
 * Regression checks for precomputed per-location digests.
 * Run: pnpm exec tsx lib/locationDigest.test.ts
 */
import assert from "node:assert/strict";
import type { NewsEvent } from "../types/news";
import { buildLocationDigests } from "./locationDigest";

let n = 0;
const ev = (
  locationName: string,
  title: string,
  description = "",
  source = "outlet",
  hoursAgo = 1,
): NewsEvent => {
  n++;
  return {
    id: `e${n}`,
    title,
    description,
    source,
    category: "news",
    tag: "General",
    publishedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
    locationName,
    lat: 26.18,
    lng: 91.75,
    intensity: 0.6,
  };
};

// --- One digest per resolved place, keyed for direct lookup ---
{
  const d = buildLocationDigests([
    ev(
      "Guwahati, Assam, India",
      "Landslide claims four lives in Guwahati",
      "",
      "sentinelassam.com",
    ),
    ev(
      "Guwahati, Assam, India",
      "Police seize 27 kg of contraband",
      "",
      "assamtribune.com",
    ),
    ev(
      "Kathmandu, Bagmati, Nepal",
      "Flood toll rises",
      "",
      "kathmandupost.com",
    ),
    ev("Kathmandu, Bagmati, Nepal", "Rescue effort continues", "", "nenow.in"),
  ]);
  // Every administrative level is keyed, so a panel titled at any granularity
  // finds a digest: city, state and country.
  const keys = new Set(d.map((x) => x.locationName));
  for (const k of [
    "Guwahati, Assam, India",
    "Assam, India",
    "India",
    "Kathmandu, Bagmati, Nepal",
    "Bagmati, Nepal",
    "Nepal",
  ]) {
    assert.ok(keys.has(k), `missing digest key: ${k}`);
  }
  for (const x of d) {
    assert.ok(x.summary.length > 20, x.summary);
    assert.ok(x.analysis.length > 20, x.analysis);
    assert.ok(x.intensity >= 1 && x.intensity <= 5);
    assert.equal(x.mentionCount, 2);
    assert.equal(x.sourceCount, 2);
    assert.ok(new Date(x.processedAt).getTime() > 0);
  }
}

// --- Places below the floor get no digest rather than a thin one ---
{
  const d = buildLocationDigests([ev("Solo, Place, India", "Only story", "")]);
  assert.equal(d.length, 0);
}

// --- The brief leads with a real headline, not a spliced fragment ---
{
  const d0 = buildLocationDigests([
    ev(
      "Guwahati, Assam, India",
      "Assam: GCU professor co-discovers new plant species",
      "A botanist described the find.",
      "sentinelassam.com",
      1,
    ),
    ev(
      "Guwahati, Assam, India",
      "NFR further revises train services in hill section",
      "Services change from Monday.",
      "assamtribune.com",
      2,
    ),
  ]);
  const d = d0.find((x) => x.locationName === "Guwahati, Assam, India");
  assert.ok(d);
  assert.ok(
    d.summary.includes("GCU professor co-discovers new plant species"),
    `lead headline should appear verbatim: ${d.summary}`,
  );
  // The old template asserted a disaster posture regardless of content.
  assert.ok(
    !/severe disaster operations|civil defense mobilizations/i.test(d.summary),
    `template boilerplate leaked back in: ${d.summary}`,
  );
}

// --- Two different places must not produce the same prose ---
{
  const d = buildLocationDigests([
    ev("Guwahati, Assam, India", "Landslide claims four lives", "", "a"),
    ev("Guwahati, Assam, India", "Police seize contraband", "", "b"),
    ev("Kathmandu, Bagmati, Nepal", "Flood toll reaches 955", "", "c"),
    ev("Kathmandu, Bagmati, Nepal", "Rescue effort continues", "", "d"),
  ]);
  const byKey = new Map(d.map((x) => [x.locationName, x]));
  const g = byKey.get("Guwahati, Assam, India");
  const k = byKey.get("Kathmandu, Bagmati, Nepal");
  assert.ok(g && k);
  assert.notEqual(g.summary, k.summary);
  assert.notEqual(g.analysis, k.analysis);
}

// --- A single-source place is flagged as uncorroborated ---
{
  const all = buildLocationDigests([
    ev("X, Y, Z", "First story", "", "onlyoutlet.com"),
    ev("X, Y, Z", "Second story", "", "onlyoutlet.com"),
  ]);
  const d = all.find((x) => x.locationName === "X, Y, Z");
  assert.ok(d);
  assert.match(d.analysis, /Single-source|uncorroborated/i);
  assert.equal(d.sourceCount, 1);
}

// --- A headline's own dateline is not repeated after the place prefix ---
{
  const all = buildLocationDigests([
    ev("Guwahati, Assam, India", "Assam: Flood relief reaches Dhubri", "", "a"),
    ev("Guwahati, Assam, India", "Assam: Rail services resume", "", "b"),
  ]);
  const d = all.find((x) => x.locationName === "Guwahati, Assam, India");
  assert.ok(d);
  assert.ok(
    !/Assam:\s*Assam:/i.test(d.summary),
    `duplicated dateline: ${d.summary}`,
  );
  assert.ok(d.summary.includes("Flood relief reaches Dhubri"), d.summary);
}

console.log("locationDigest.ts: all checks passed");
