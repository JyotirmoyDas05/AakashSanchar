import { type NextRequest, NextResponse } from "next/server";
import { detectSourceLang } from "@/lib/detectLang";

const MEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";

const cache = new Map<string, string>();

function splitIntoChunks(text: string, max = 480): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    // Prefer to split at sentence or word boundary near `max`
    let splitAt = remaining.lastIndexOf(" ", max);
    if (splitAt === -1) splitAt = remaining.lastIndexOf("।", max);
    if (splitAt === -1) splitAt = remaining.lastIndexOf(".", max);
    if (splitAt === -1 || splitAt < max * 0.5) splitAt = max;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function translateChunk(
  chunk: string,
  from: string,
  to: string,
): Promise<string> {
  const cacheKey = `${from}|${to}|${chunk}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) as string;
  const url = `${MEMORY_ENDPOINT}?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error("translate failed");
  const data = await res.json();
  const translated = data?.responseData?.translatedText as string | undefined;
  if (!translated) throw new Error("no translation");
  cache.set(cacheKey, translated);
  return translated;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").trim();
  const to = searchParams.get("to") || "en";
  let from = (searchParams.get("from") ?? "").trim().toLowerCase();

  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }

  // Infer source language when not provided (script-based heuristic).
  if (!from) {
    const detected = detectSourceLang(text);
    if (!detected) {
      return NextResponse.json({ text, source: "en", translated: false });
    }
    from = detected;
  }

  if (from === "en") {
    return NextResponse.json({ text, source: "en", translated: false });
  }

  // Chunk long texts (descriptions can be up to ~1000 chars) to stay under MyMemory's ~500 limit
  const chunks = splitIntoChunks(text);
  // Single-chunk fast path with cache
  if (chunks.length === 1) {
    const cacheKey = `${from}|${to}|${text}`;
    if (cache.has(cacheKey)) {
      return NextResponse.json({
        text: cache.get(cacheKey),
        source: from,
        translated: true,
      });
    }
  }

  try {
    const translatedChunks = await Promise.all(
      chunks.map((c) => translateChunk(c, from, to)),
    );
    const translated = translatedChunks.join(" ");
    // Cache the full text as well for future single-fetch hits
    cache.set(`${from}|${to}|${text}`, translated);
    return NextResponse.json({
      text: translated,
      source: from,
      translated: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Translation unavailable" },
      { status: 502 },
    );
  }
}
