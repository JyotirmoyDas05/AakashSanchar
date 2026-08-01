/**
 * GDELT Events API route.
 * Fetches the latest 15-min events CSV from data.gdeltproject.org,
 * parses it, and serves it as JSON. Server-side cached for 10 minutes.
 */

import { type NextRequest, NextResponse } from "next/server";
import { GDELT_LASTUPDATE_URL, parseGdeltEventsCsv } from "@/lib/gdelt";

// In-memory server-side cache
let cachedEvents: ReturnType<typeof parseGdeltEventsCsv> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

async function fetchLatestEventsCsv(): Promise<string> {
  // Step 1: Get the latest CSV URL from lastupdate.txt
  const updateRes = await fetch(GDELT_LASTUPDATE_URL, {
    next: { revalidate: 900 },
  });
  if (!updateRes.ok)
    throw new Error(`lastupdate.txt failed: ${updateRes.status}`);

  const updateText = await updateRes.text();
  // First line: "<size> <hash> <url>"
  const firstLine = updateText.trim().split("\n")[0];
  const csvUrl = firstLine.trim().split(/\s+/).pop();
  if (!csvUrl) throw new Error("Could not parse CSV URL from lastupdate.txt");

  // Step 2: Download the ZIP
  const zipRes = await fetch(csvUrl);
  if (!zipRes.ok) throw new Error(`CSV ZIP download failed: ${zipRes.status}`);

  const zipBuffer = await zipRes.arrayBuffer();

  // Step 3: Unzip in-memory (ZIP with single CSV entry)
  const csvText = await unzipSingleEntry(new Uint8Array(zipBuffer));
  return csvText;
}

/** Minimal ZIP parser for a single-entry ZIP archive (GDELT always has 1 file) */
async function unzipSingleEntry(zipBytes: Uint8Array): Promise<string> {
  // Use DecompressionStream (available in Node 18+ / modern browsers)
  // Find the local file header (PK\x03\x04)
  let offset = 0;
  if (
    zipBytes[0] !== 0x50 ||
    zipBytes[1] !== 0x4b ||
    zipBytes[2] !== 0x03 ||
    zipBytes[3] !== 0x04
  ) {
    throw new Error("Not a valid ZIP file");
  }

  // Parse local file header
  const compressionMethod = zipBytes[8] | (zipBytes[9] << 8);
  const compressedSize =
    zipBytes[18] |
    (zipBytes[19] << 8) |
    (zipBytes[20] << 16) |
    (zipBytes[21] << 24);
  const fileNameLength = zipBytes[26] | (zipBytes[27] << 8);
  const extraFieldLength = zipBytes[28] | (zipBytes[29] << 8);

  offset = 30 + fileNameLength + extraFieldLength;
  const compressedData = zipBytes.slice(offset, offset + compressedSize);

  if (compressionMethod === 0) {
    // Stored (no compression)
    return new TextDecoder().decode(compressedData);
  }

  if (compressionMethod === 8) {
    // Deflate
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(compressedData);
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return new TextDecoder().decode(result);
  }

  throw new Error(`Unsupported compression method: ${compressionMethod}`);
}

export async function GET(_request: NextRequest) {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedEvents && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        events: cachedEvents,
        cached: true,
        cachedAt: new Date(cacheTimestamp).toISOString(),
        count: cachedEvents.length,
      });
    }

    // Fetch fresh data
    const csvText = await fetchLatestEventsCsv();
    const events = parseGdeltEventsCsv(csvText);

    // Update cache
    cachedEvents = events;
    cacheTimestamp = now;

    return NextResponse.json({
      events,
      cached: false,
      cachedAt: new Date(now).toISOString(),
      count: events.length,
    });
  } catch (error) {
    console.error("[GDELT Events API]", error);

    // Return stale cache if available
    if (cachedEvents) {
      return NextResponse.json({
        events: cachedEvents,
        cached: true,
        stale: true,
        cachedAt: new Date(cacheTimestamp).toISOString(),
        count: cachedEvents.length,
        error: String(error),
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch GDELT events", details: String(error) },
      { status: 500 },
    );
  }
}
