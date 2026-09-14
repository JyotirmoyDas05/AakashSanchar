/**
 * Builds data/gazetteer.json from GeoNames.
 *
 * Source: https://download.geonames.org/export/dump/ (CC BY 4.0)
 *   cities15000.txt      — every populated place over 15,000 people
 *   admin1CodesASCII.txt — state / province / UT names
 *
 * Output is server-only: lib/geocode.ts loads it inside the API route so the
 * browser never downloads it. Re-run with:  node scripts/build-gazetteer.mjs
 */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TMP = join(ROOT, ".gazetteer-tmp");
const OUT = join(ROOT, "data", "gazetteer.json");

const CITIES_URL = "https://download.geonames.org/export/dump/cities15000.zip";
const ADMIN1_URL =
  "https://download.geonames.org/export/dump/admin1CodesASCII.txt";

// Latin-script alternate names only (Bombay/Mumbai, Calcutta/Kolkata, Bangalore/Bengaluru).
const LATIN = /^[a-zA-Z][a-zA-Z\s'.-]{2,}$/;

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

/** cities15000.zip holds a single deflate entry; unwrap it without a dep. */
async function unzipSingle(zipPath, outPath) {
  const buf = await readFile(zipPath);
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error("not a zip");
  const method = buf.readUInt16LE(8);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const start = 30 + nameLen + extraLen;
  if (method === 0) {
    await writeFile(outPath, buf.subarray(start, start + buf.readUInt32LE(18)));
    return;
  }
  // Raw deflate -> gunzip needs a header, so use inflateRaw via a stream.
  const { createInflateRaw } = await import("node:zlib");
  const { Readable } = await import("node:stream");
  await pipeline(
    Readable.from(buf.subarray(start)),
    createInflateRaw(),
    createWriteStream(outPath),
  );
  void createGunzip;
}

async function main() {
  await mkdir(TMP, { recursive: true });
  await mkdir(dirname(OUT), { recursive: true });

  console.log("downloading GeoNames…");
  await download(CITIES_URL, join(TMP, "cities.zip"));
  await download(ADMIN1_URL, join(TMP, "admin1.txt"));
  await unzipSingle(join(TMP, "cities.zip"), join(TMP, "cities.txt"));

  // admin1 code ("IN.03") -> display name ("Assam")
  const admin1Name = new Map();
  for (const line of (await readFile(join(TMP, "admin1.txt"), "utf8")).split(
    "\n",
  )) {
    const [code, name] = line.split("\t");
    if (code && name) admin1Name.set(code, name);
  }

  const countries = [];
  const countryIdx = new Map();
  const admin1s = [];
  const admin1Idx = new Map();
  const places = [];

  // Accumulators for synthesising state- and country-level entries from their
  // own cities, so "Assam" and "India" resolve without a second dataset.
  const a1Acc = new Map();
  const cAcc = new Map();

  const idx = (list, map, key) => {
    let i = map.get(key);
    if (i === undefined) {
      i = list.length;
      list.push(key);
      map.set(key, i);
    }
    return i;
  };

  const text = await readFile(join(TMP, "cities.txt"), "utf8");
  let cityCount = 0;

  for (const line of text.split("\n")) {
    if (!line) continue;
    const f = line.split("\t");
    const name = f[1];
    const ascii = f[2];
    const alts = f[3];
    const lat = Number.parseFloat(f[4]);
    const lng = Number.parseFloat(f[5]);
    const cc = f[8];
    const a1code = f[10];
    const pop = Number.parseInt(f[14], 10) || 0;
    if (!name || !cc || !Number.isFinite(lat) || !Number.isFinite(lng))
      continue;

    const country = COUNTRY_NAME[cc];
    if (!country) continue;
    const a1 = admin1Name.get(`${cc}.${a1code}`) || "";

    const ci = idx(countries, countryIdx, country);
    const ai = a1 ? idx(admin1s, admin1Idx, a1) : -1;

    const names = new Set([name]);
    if (ascii && ascii !== name) names.add(ascii);
    // Historic/alternate spellings matter a lot for Indian city names, but the
    // column is huge, so only mine it for places big enough to appear in wires.
    if (alts && pop >= 100000) {
      let taken = 0;
      for (const alt of alts.split(",")) {
        if (taken >= 4) break;
        if (alt.length >= 4 && alt.length <= 24 && LATIN.test(alt)) {
          if (!names.has(alt)) {
            names.add(alt);
            taken++;
          }
        }
      }
    }

    for (const n of names) {
      places.push([n, +lat.toFixed(4), +lng.toFixed(4), ai, ci, pop, 0]);
    }
    cityCount++;

    if (ai >= 0) {
      const acc = a1Acc.get(ai) || { lat: 0, lng: 0, w: 0, ci };
      const w = Math.max(pop, 1000);
      acc.lat += lat * w;
      acc.lng += lng * w;
      acc.w += w;
      a1Acc.set(ai, acc);
    }
    const acc = cAcc.get(ci) || { lat: 0, lng: 0, w: 0 };
    const w = Math.max(pop, 1000);
    acc.lat += lat * w;
    acc.lng += lng * w;
    acc.w += w;
    cAcc.set(ci, acc);
  }

  // kind 1 = state / province / UT, positioned at its own population centroid
  for (const [ai, a] of a1Acc) {
    places.push([
      admin1s[ai],
      +(a.lat / a.w).toFixed(4),
      +(a.lng / a.w).toFixed(4),
      ai,
      a.ci,
      Math.round(a.w),
      1,
    ]);
  }
  // kind 2 = country
  for (const [ci, a] of cAcc) {
    places.push([
      countries[ci],
      +(a.lat / a.w).toFixed(4),
      +(a.lng / a.w).toFixed(4),
      -1,
      ci,
      Math.round(a.w),
      2,
    ]);
  }

  const out = { countries, admin1s, places };
  await writeFile(OUT, JSON.stringify(out));
  await rm(TMP, { recursive: true, force: true });

  const bytes = JSON.stringify(out).length;
  console.log(
    `wrote ${OUT}\n  ${cityCount} cities, ${admin1s.length} admin1, ${countries.length} countries` +
      `\n  ${places.length} lookup entries, ${(bytes / 1048576).toFixed(2)} MB`,
  );
}

// ISO 3166-1 alpha-2 -> display name. Sourced from GeoNames countryInfo.txt;
// inlined so the build needs two downloads instead of three.
const COUNTRY_NAME = JSON.parse(
  await readFile(
    join(dirname(fileURLToPath(import.meta.url)), "country-names.json"),
    "utf8",
  ),
);

await main();
