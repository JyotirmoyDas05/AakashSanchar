/**
 * Regression checks for extractive region analysis.
 * Run: pnpm exec tsx lib/regionAnalysis.test.ts
 */
import assert from "node:assert/strict";
import type { NewsEvent } from "../types/news";
import {
  buildAnalysis,
  extractMetrics,
  extractNamedEntities,
} from "./regionAnalysis";

let n = 0;
const ev = (
  title: string,
  description = "",
  hoursAgo = 1,
  source = `outlet${n}`,
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
    locationName: "Kathmandu, Bagmati, Nepal",
    lat: 27.7,
    lng: 85.3,
    intensity: 0.6,
  };
};

// --- Figures come out of the copy, highest per noun ---
{
  const m = extractMetrics([
    ev("Nepal flood", "The death toll rose to 903, with over 4,200 missing."),
    ev("Nepal flood update", "The death toll from the flood rose to 955."),
    ev(
      "Aid appeal",
      "At least 93,000 people require aid and 2,300 are injured.",
    ),
  ]);
  const byText = m.map((x) => x.text);
  assert.ok(
    byText.some((t) => t === "955 dead"),
    `revised toll should win, got ${byText.join(" | ")}`,
  );
  assert.ok(
    byText.some((t) => t === "4,200 missing"),
    byText.join(" | "),
  );
  assert.ok(
    byText.some((t) => t === "2,300 injured"),
    byText.join(" | "),
  );
  // sorted by magnitude, capped
  assert.ok(m.length <= 4);
  assert.ok(m[0].value >= m[m.length - 1].value);
}

// --- Named entities: real multi-word proper nouns, not sentence-initial words ---
{
  const e = extractNamedEntities(
    [
      ev("x", "Officials said the Red Cross warned of a secondary flood."),
      ev("y", "The Red Cross and the National Disaster Authority responded."),
      ev("z", "Rescue teams from the National Disaster Authority arrived."),
    ],
    "Nepal",
  );
  assert.ok(e.includes("Red Cross"), e.join(" | "));
  assert.ok(e.includes("National Disaster Authority"), e.join(" | "));
  // "Officials"/"Rescue" begin sentences and are single words — not entities
  assert.ok(!e.some((x) => x.startsWith("Officials")), e.join(" | "));
}

// --- The reported bug: identical prose for every region ---
{
  const breakdown = [
    { label: "Flood", pct: 60, category: "disaster" as const },
  ];
  const nepal = buildAnalysis(
    [
      ev("Nepal flood", "The death toll rose to 955.", 2),
      ev("Rescue", "The Red Cross warned of a barrier lake.", 3),
    ],
    "Nepal",
    breakdown,
    ["Rasuwa"],
  );
  const assam = buildAnalysis(
    [
      ev(
        "GCU professor co-discovers new plant species",
        "A botanist described it.",
        4,
      ),
      ev(
        "NFR revises train services",
        "Services in the hill section change.",
        5,
      ),
    ],
    "Assam",
    [{ label: "General", pct: 63, category: "news" as const }],
    ["Guwahati"],
  );
  assert.notEqual(
    nepal.impactAssessment,
    assam.impactAssessment,
    "two different regions must not produce identical impact text",
  );
  assert.ok(nepal.impactAssessment?.includes("Nepal"));
  assert.ok(assam.impactAssessment?.includes("Assam"));
  // The old template asserted troop deployments nobody reported.
  for (const p of [nepal, assam]) {
    const all = `${p.impactAssessment} ${p.operationalDynamics} ${p.escalationOutlook}`;
    assert.ok(
      !/engineering battalions|evacuation perimeters|rapid-reaction detachments/i.test(
        all,
      ),
      `fabricated military boilerplate leaked back in: ${all}`,
    );
  }
  // Nepal's figures surface; Assam has none to show.
  assert.ok(nepal.impactAssessment?.includes("955 dead"));
  assert.ok(!/Figures reported/.test(assam.impactAssessment ?? ""));
}

// --- A pillar with nothing behind it is dropped, not padded ---
{
  const p = buildAnalysis(
    [ev("Council meets", "council meets today.", 1)],
    "Somewhere",
    [],
    [],
  );
  assert.equal(
    p.operationalDynamics,
    null,
    "no named entities -> pillar must be null so the panel omits it",
  );
  assert.ok(p.impactAssessment, "impact is always derivable from counts");
}

// --- Empty input is safe ---
{
  const p = buildAnalysis([], "Nowhere", [], []);
  assert.equal(p.impactAssessment, null);
  assert.equal(p.operationalDynamics, null);
  assert.equal(p.escalationOutlook, null);
}

// --- Cadence is measured, not predicted ---
{
  const rising = buildAnalysis(
    [
      ev("a", "", 20),
      ev("b", "", 19),
      ev("c", "", 2),
      ev("d", "", 1),
      ev("e", "", 1),
      ev("f", "", 1),
    ],
    "X",
    [],
    [],
  );
  assert.match(rising.escalationOutlook ?? "", /accelerating/);

  const flat = buildAnalysis(
    [ev("a", "", 8), ev("b", "", 6), ev("c", "", 4), ev("d", "", 2)],
    "X",
    [],
    [],
  );
  assert.match(flat.escalationOutlook ?? "", /steady/);
}

// --- A garbage feed timestamp must not stretch the window ---
{
  const bad = {
    ...ev("old", "", 1),
    publishedAt: new Date("1970-01-01T00:00:00Z").toISOString(),
  };
  const future = {
    ...ev("future", "", 1),
    publishedAt: new Date(Date.now() + 400 * 86_400_000).toISOString(),
  };
  const p = buildAnalysis(
    [bad, future, ev("a", "", 3), ev("b", "", 2), ev("c", "", 1)],
    "X",
    [],
    [],
  );
  assert.ok(
    !/\d{3,}d/.test(p.impactAssessment ?? ""),
    `epoch/far-future dates leaked into the window: ${p.impactAssessment}`,
  );
}

// --- Overlapping windows of one name collapse to the longest form ---
{
  const e = extractNamedEntities(
    [
      ev("x", "Officials said Chief Minister Himanta Biswa Sarma spoke today."),
      ev("y", "Later, Chief Minister Himanta Biswa Sarma met the press."),
    ],
    "Assam",
  );
  const overlapping = e.filter((a) =>
    e.some((b) => a !== b && b.toLowerCase().includes(a.toLowerCase())),
  );
  assert.deepEqual(
    overlapping,
    [],
    `overlapping n-grams kept: ${e.join(" | ")}`,
  );
}

// --- All-caps datelines are not organisations ---
{
  const e = extractNamedEntities(
    [
      ev(
        "x",
        "Reporters said KOHIMA AUG saw the Nagaland Legislative Assembly meet.",
      ),
      ev("y", "Members of the Nagaland Legislative Assembly spoke again."),
    ],
    "Nagaland",
  );
  assert.ok(!e.includes("KOHIMA AUG"), e.join(" | "));
}

console.log("regionAnalysis.ts: all checks passed");
