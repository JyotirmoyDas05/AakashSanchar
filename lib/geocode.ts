/**
 * Server-only place resolution for RSS articles.
 *
 * RSS gives a headline and a URL, never coordinates. This resolves a real place
 * from the text against the GeoNames gazetteer (data/gazetteer.json, built by
 * scripts/build-gazetteer.mjs) and returns null when it cannot. Callers must
 * treat null as "no marker" — the previous behaviour of dropping the article on
 * a country centroid plus a decorative spiral put Bangladeshi wires inside
 * Assam and every unmatched country in central India.
 *
 * Do NOT import this from client code; it pulls in a ~3 MB dataset.
 */
import gazetteer from "@/data/gazetteer.json";

export interface ResolvedPlace {
  /** "Guwahati, Assam, India" — the shape lib/search.ts indexes. */
  locationName: string;
  lat: number;
  lng: number;
  /** 0 = city, 1 = state/province/UT, 2 = country */
  precision: 0 | 1 | 2;
}

type Entry = [
  name: string,
  lat: number,
  lng: number,
  a1: number,
  country: number,
  pop: number,
  kind: 0 | 1 | 2,
];

const DATA = gazetteer as unknown as {
  countries: string[];
  admin1s: string[];
  places: Entry[];
};

// Place names that are also ordinary English words. Matching these on their own
// produces nonsense ("Same, Tanzania" for the word "same"), so a bare
// single-word hit on one of these is ignored. Linguistic, not geographic — it
// does not encode where anything is.
const AMBIGUOUS = new Set([
  "same",
  "man",
  "split",
  "nice",
  "reading",
  "mobile",
  "bath",
  "born",
  "best",
  "central",
  "north",
  "south",
  "east",
  "west",
  "union",
  "general",
  "president",
  "national",
  "federal",
  "capital",
  "royal",
  "victoria",
  "george",
  "many",
  "most",
  "even",
  "long",
  "young",
  "white",
  "black",
  "green",
  "orange",
  "pace",
  "point",
  "rock",
  "hope",
  "eagle",
  "industry",
  "progress",
  "liberty",
  "independence",
  "police",
  "asia",
  "naga",
  "europe",
  "africa",
  "america",
  "police station",
  "market",
  "college",
  "university",
  "hospital",
  "airport",
  "border",
  "summit",
  "mission",
  "media",
  "post",
  "times",
  "express",
  "mirror",
  "standard",
  "chronicle",
  "энергия",
]);

let index: Map<string, Entry[]> | null = null;
let maxWords = 1;
// Names that are also a country or a state. A city sharing one ("Bangladesh",
// a district of Yerevan) is almost never what a news headline means.
const bigNames = new Set<string>();

function getIndex(): Map<string, Entry[]> {
  if (index) return index;
  for (const c of DATA.countries) bigNames.add(c.toLowerCase());
  for (const a of DATA.admin1s) bigNames.add(a.toLowerCase());
  const m = new Map<string, Entry[]>();
  for (const e of DATA.places) {
    const key = e[0].toLowerCase();
    if (key.length < 4) continue;
    const words = key.split(" ").length;
    if (words > maxWords) maxWords = words;
    const bucket = m.get(key);
    if (bucket) bucket.push(e);
    else m.set(key, [e]);
  }
  index = m;
  return m;
}

/** Words as they appear, plus a lowercase copy, so capitalisation survives. */
function tokenize(text: string): { raw: string[]; low: string[] } {
  const raw = text
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  return { raw, low: raw.map((w) => w.toLowerCase()) };
}

interface Candidate {
  entry: Entry;
  words: number;
  capitalised: boolean;
}

function collect(text: string): Candidate[] {
  const idx = getIndex();
  const { raw, low } = tokenize(text);
  const out: Candidate[] = [];

  for (let i = 0; i < low.length; i++) {
    for (let n = Math.min(maxWords, low.length - i); n >= 1; n--) {
      const phrase = low.slice(i, i + n).join(" ");
      if (phrase.length < 4) continue;
      const hits = idx.get(phrase);
      if (!hits) continue;
      if (AMBIGUOUS.has(phrase)) break;
      // Proper nouns are capitalised even in sentence-case body copy.
      const capitalised = raw
        .slice(i, i + n)
        .every((w) => /^[\p{Lu}]/u.test(w));
      for (const entry of hits) out.push({ entry, words: n, capitalised });
      // Consume the phrase. Without this "Sri Lanka" would also emit a match
      // for "Lanka", a real town in Assam, and the town would win on kind.
      i += n - 1;
      break;
    }
  }
  return out;
}

function score(c: Candidate, all: Candidate[], hintCountry?: string): number {
  const [, , , a1, country, pop, kind] = c.entry;
  // Capped: a state's stored population is the sum of its cities, so an
  // uncapped log would let "Assam" outrank "Guwahati" in the same sentence.
  let s = Math.min(Math.log10(pop + 10), 6.5);
  // Multi-word names ("Arunachal Pradesh") are far less likely to be chance hits.
  s += (c.words - 1) * 3;
  if (c.capitalised) s += 2;
  // A city corroborated by its own state or country elsewhere in the text is
  // almost certainly the real subject.
  for (const other of all) {
    if (other === c) continue;
    if (other.entry[4] === country) s += 1.5;
    if (a1 >= 0 && other.entry[3] === a1) s += 2;
  }
  // Prefer the most specific resolution that survives the above.
  s += kind === 0 ? 3 : kind === 1 ? 1 : 0;
  // ...but not when the "city" is really a country's name worn by some unrelated
  // neighbourhood on the other side of the world.
  if (kind === 0 && bigNames.has(c.entry[0].toLowerCase())) s -= 8;
  // The publishing outlet's own country is a weak but real prior: an Assam
  // paper writing about "Naga villages" means Nagaland, not Naga in Bicol.
  if (hintCountry && DATA.countries[country] === hintCountry) s += 2.5;
  return s;
}

const MIN_SCORE = 4.5;

/**
 * Resolve the most likely place mentioned in an article.
 * Returns null when nothing scores confidently — caller should omit the marker.
 */
export function resolvePlace(
  title: string,
  description = "",
  sourceCountry?: string,
): ResolvedPlace | null {
  const text = `${title}. ${description.slice(0, 500)}`;
  const candidates = collect(text);
  if (!candidates.length) return null;

  let best: Candidate | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = score(c, candidates, sourceCountry);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  if (!best || bestScore < MIN_SCORE) return null;

  const [name, lat, lng, a1, country, , kind] = best.entry;
  const admin1 = a1 >= 0 ? DATA.admin1s[a1] : "";
  const countryName = DATA.countries[country];

  // "Guwahati, Assam, India" / "Assam, India" / "India"
  const parts =
    kind === 2
      ? [countryName]
      : kind === 1
        ? [name, countryName]
        : [name, admin1, countryName].filter(Boolean);

  return {
    locationName: [...new Set(parts)].join(", "),
    lat,
    lng,
    precision: kind,
  };
}
