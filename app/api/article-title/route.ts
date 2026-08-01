import { type NextRequest, NextResponse } from "next/server";
import { extractTitleFromUrl } from "@/lib/articleTitle";

const titleCache = new Map<string, string>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl || targetUrl === "#") {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let formattedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  if (titleCache.has(formattedUrl)) {
    return NextResponse.json({
      title: titleCache.get(formattedUrl),
      cached: true,
    });
  }

  const fallbackTitle = extractTitleFromUrl(formattedUrl);

  try {
    const res = await fetch(formattedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) {
      if (fallbackTitle) {
        titleCache.set(formattedUrl, fallbackTitle);
        return NextResponse.json({ title: fallbackTitle, fallback: true });
      }
      return NextResponse.json(
        { error: "Failed to fetch article" },
        { status: 502 },
      );
    }

    const html = await res.text();

    let rawTitle = "";

    const ogMatch =
      html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
      );

    if (ogMatch?.[1]) {
      rawTitle = ogMatch[1];
    } else {
      const twitterMatch =
        html.match(
          /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i,
        ) ||
        html.match(
          /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:title["']/i,
        );
      if (twitterMatch?.[1]) {
        rawTitle = twitterMatch[1];
      } else {
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch?.[1]) {
          rawTitle = titleMatch[1];
        }
      }
    }

    if (!rawTitle.trim()) {
      const title = fallbackTitle || "Article Source";
      titleCache.set(formattedUrl, title);
      return NextResponse.json({ title });
    }

    let cleaned = rawTitle
      .replace(/&#(\d+);/g, (_, dec) =>
        String.fromCharCode(Number.parseInt(dec, 10)),
      )
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      )
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    cleaned = cleaned.replace(/\s+[|-]\s+[^|-]+$/i, "").trim();

    if (cleaned.length > 5) {
      titleCache.set(formattedUrl, cleaned);
      return NextResponse.json({ title: cleaned });
    }

    const title = fallbackTitle || rawTitle;
    titleCache.set(formattedUrl, title);
    return NextResponse.json({ title });
  } catch {
    if (fallbackTitle) {
      titleCache.set(formattedUrl, fallbackTitle);
      return NextResponse.json({ title: fallbackTitle, fallback: true });
    }
    return NextResponse.json({ error: "Fetch timeout" }, { status: 504 });
  }
}
