import { NextResponse } from "next/server";

interface SymbolDef {
  symbol: string;
  yahoo: string;
  name: string;
  category: "overview" | "crypto";
}

const SYMBOLS: SymbolDef[] = [
  {
    symbol: "SPX",
    yahoo: "^GSPC",
    name: "S&P 500 Index",
    category: "overview",
  },
  {
    symbol: "IXIC",
    yahoo: "^IXIC",
    name: "Nasdaq Composite",
    category: "overview",
  },
  {
    symbol: "DJI",
    yahoo: "^DJI",
    name: "Dow Jones Industrial",
    category: "overview",
  },
  {
    symbol: "CL1!",
    yahoo: "CL=F",
    name: "Crude Oil Futures",
    category: "overview",
  },
  { symbol: "GC1!", yahoo: "GC=F", name: "Gold Futures", category: "overview" },
  {
    symbol: "BTC",
    yahoo: "BTC-USD",
    name: "Bitcoin / USD",
    category: "crypto",
  },
  {
    symbol: "ETH",
    yahoo: "ETH-USD",
    name: "Ethereum / USD",
    category: "crypto",
  },
  { symbol: "SOL", yahoo: "SOL-USD", name: "Solana / USD", category: "crypto" },
  {
    symbol: "DOGE",
    yahoo: "DOGE-USD",
    name: "Dogecoin / USD",
    category: "crypto",
  },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 30_000;

async function fetchQuote(yahoo: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahoo,
  )}?range=1d&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("no result");
  const meta = result.meta ?? {};
  const price =
    typeof meta.regularMarketPrice === "number"
      ? meta.regularMarketPrice
      : (result.indicators?.quote?.[0]?.close?.at(-1) as number | undefined);
  const prevClose =
    typeof meta.chartPreviousClose === "number"
      ? meta.chartPreviousClose
      : (meta.previousClose as number | undefined);
  if (typeof price !== "number" || typeof prevClose !== "number") {
    throw new Error("bad price");
  }
  const change = price - prevClose;
  const changePercent = (change / prevClose) * 100;
  return { price, change, changePercent };
}

export async function GET() {
  const now = Date.now();
  const cached = cache.get("quotes");
  if (cached && now - cached.ts < TTL) {
    return NextResponse.json({ quotes: cached.data, cached: true });
  }

  const quotes = await Promise.all(
    SYMBOLS.map(async (s) => {
      try {
        const q = await fetchQuote(s.yahoo);
        return {
          symbol: s.symbol,
          name: s.name,
          category: s.category,
          price: Number(
            q.price.toFixed(s.category === "crypto" && q.price < 1 ? 4 : 2),
          ),
          change: Number(q.change.toFixed(2)),
          changePercent: Number(q.changePercent.toFixed(2)),
          direction: (q.changePercent >= 0 ? "up" : "down") as
            | "up"
            | "down"
            | "flat",
          ok: true,
        };
      } catch {
        return {
          symbol: s.symbol,
          name: s.name,
          category: s.category,
          price: 0,
          change: 0,
          changePercent: 0,
          direction: "flat" as const,
          ok: false,
        };
      }
    }),
  );

  cache.set("quotes", { data: quotes, ts: now });
  return NextResponse.json({ quotes });
}
