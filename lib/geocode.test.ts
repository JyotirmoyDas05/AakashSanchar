/**
 * Regression checks for RSS place resolution.
 * Run: pnpm exec tsx lib/geocode.test.ts
 *
 * Each case here is a bug that shipped. Keep them.
 */
import assert from "node:assert/strict";
import { resolvePlace } from "./geocode";

const at = (title: string, desc = "", src?: string) =>
  resolvePlace(title, desc, src);

// --- The reported bug: a Bangladeshi outlet rendered inside Assam ---
{
  const r = at(
    "Bangladesh election: Dhaka braces for protests",
    "Reported by prothomalo.",
    "Bangladesh",
  );
  assert.ok(r, "should resolve");
  assert.match(r.locationName, /Bangladesh$/);
  assert.ok(
    !r.locationName.includes("Assam"),
    "Bangladeshi news must never land in Assam",
  );
  assert.ok(r.lat > 20 && r.lat < 27 && r.lng > 88 && r.lng < 93);
}

// --- State-level resolution, the thing country centroids could never do ---
for (const [title, expectAdmin1] of [
  [
    "Assam floods: 3 dead as Brahmaputra breaches embankment in Guwahati",
    "Assam",
  ],
  ["Manipur violence: curfew imposed in Imphal", "Manipur"],
  ["Kohima records heavy rainfall, Nagaland issues advisory", "Nagaland"],
  ["Shillong hosts North East festival", "Meghalaya"],
  ["Aizawl civic body clears new market plan", "Mizoram"],
  ["Itanagar sees fresh protests", "Arunachal Pradesh"],
] as const) {
  const r = at(title, "", "India");
  assert.ok(r, `no resolution for: ${title}`);
  assert.ok(
    r.locationName.includes(expectAdmin1),
    `${title}\n  expected ${expectAdmin1}, got ${r.locationName}`,
  );
}

// --- The most specific confident match wins over its own parent ---
{
  const r = at("Assam floods hit Guwahati", "", "India");
  assert.ok(r, "should resolve");
  assert.ok(r.locationName.startsWith("Guwahati"), r.locationName);
  assert.equal(r.precision, 0);
}

// --- Unplaceable copy gets no marker rather than a fabricated one ---
for (const title of [
  "Apple to launch next iPhone in September",
  "Stocks rally as inflation cools",
]) {
  assert.equal(at(title, "Markets update."), null, `${title} should not place`);
}

// --- Town names that are also ordinary words ---
{
  // "Police" is a real town in West Pomerania; it used to swallow every crime story.
  const r = at("Man beaten to death, Police arrest two", "", "India");
  assert.ok(
    !r || !r.locationName.startsWith("Police,"),
    `crime copy resolved to the Polish town: ${r?.locationName}`,
  );
  // "Naga" is a town in Bicol and an ethnonym in North East India.
  const n = at("Tension continues as Naga villages protest", "", "India");
  assert.ok(
    !n || !n.locationName.endsWith("Philippines"),
    `Naga resolved to the Philippines: ${n?.locationName}`,
  );
}

// --- A longer name must consume its own suffix ---
{
  // "Lanka" is a real town in Assam; "Sri Lanka" must not decompose into it.
  const r = at("Sri Lanka lose Women's Champions Trophy hosting rights");
  assert.ok(
    !r || !r.locationName.startsWith("Lanka,"),
    `"Sri Lanka" decomposed into Lanka, Assam: ${r?.locationName}`,
  );
}

// --- A city sharing a country's name is not that country ---
{
  // "Bangladesh" is also a district of Yerevan.
  const r = at("Trump hopes to meet PM soon", "Bangladesh politics update.");
  assert.ok(
    !r || !r.locationName.endsWith("Armenia"),
    `resolved to the Yerevan district: ${r?.locationName}`,
  );
}

// --- locationName must be the shape lib/search.ts indexes ---
{
  const r = at("Landslide claims four lives in Guwahati", "", "India");
  assert.ok(r);
  const parts = r.locationName.split(",").map((p) => p.trim());
  assert.equal(parts.length, 3, r.locationName);
  assert.equal(parts[2], "India");
}

console.log("geocode.ts: all checks passed");
