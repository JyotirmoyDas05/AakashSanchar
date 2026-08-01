/**
 * Utility to extract and format full article titles from news article URLs.
 */

// Common acronyms to preserve in uppercase
const ACRONYMS = new Set([
  "UN",
  "US",
  "USA",
  "UK",
  "EU",
  "NATO",
  "WHO",
  "IAEA",
  "IDF",
  "COP",
  "G7",
  "G20",
  "CDC",
  "FDA",
  "NASA",
]);

// Minor words to keep lowercase unless at start or end
const MINOR_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "for",
  "nor",
  "on",
  "at",
  "to",
  "from",
  "by",
  "over",
  "under",
  "in",
  "of",
  "with",
  "as",
]);

export function extractTitleFromUrl(urlStr?: string | null): string | null {
  if (!urlStr || urlStr === "#" || !urlStr.trim()) return null;

  try {
    let cleanUrl = urlStr.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const parsed = new URL(cleanUrl);
    const pathname = parsed.pathname;

    const rawSegments = pathname
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawSegments.length === 0) return null;

    // Filter out obvious non-slug segments
    const validSegments = rawSegments.filter((seg) => {
      const s = seg.toLowerCase().replace(/\.(html?|php|aspx?|xml|ashx)$/i, "");
      if (!s) return false;
      if (/^\d+$/.test(s)) return false; // numeric ID or year/month/day
      if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i.test(s))
        return false;
      if (
        /^(world|news|articles?|live|latest|politics|business|sport|tech|opinion)$/i.test(
          s,
        )
      )
        return false;
      if (s === "index" || s === "default") return false;
      return true;
    });

    if (validSegments.length === 0) return null;

    // Pick segment with maximum hyphenated/underscored words
    let bestSegment = "";
    let maxWords = 0;

    for (const rawSeg of validSegments) {
      let seg = rawSeg.replace(/\.(html?|php|aspx?|xml|ashx)$/i, "");
      // Remove trailing date or hash suffixes e.g. -2026-07-26 or -20260726 or -1234567 or -intl
      seg = seg.replace(/[-_]\d{4}[-_]?\d{2}[-_]?\d{2}.*$/i, "");
      seg = seg.replace(/[-_][0-9a-f]{8,}$/i, "");
      seg = seg.replace(/[-_]intl$/i, "");

      const words = seg
        .split(/[-_]+/)
        .filter((w) => w.length > 0 && !/^\d+$/.test(w));
      if (words.length > maxWords) {
        maxWords = words.length;
        bestSegment = seg;
      }
    }

    if (maxWords < 2) return null;

    const rawWords = bestSegment.split(/[-_]+/).filter(Boolean);
    const cleanWords = rawWords.filter(
      (w) => !/^[0-9a-f]{8,}$/i.test(w) && !/^\d+$/.test(w),
    );

    if (cleanWords.length < 2) return null;

    const formatted = cleanWords
      .map((word, idx) => {
        const upper = word.toUpperCase();
        if (ACRONYMS.has(upper)) return upper;
        const lower = word.toLowerCase();
        if (idx > 0 && idx < cleanWords.length - 1 && MINOR_WORDS.has(lower)) {
          return lower;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");

    return formatted.length >= 10 ? formatted : null;
  } catch {
    return null;
  }
}
