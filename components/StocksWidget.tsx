"use client";

import { useEffect, useRef, useState } from "react";
import FloatingWindow from "./FloatingWindow";

interface TickerData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  category: "overview" | "crypto";
  ok: boolean;
}

interface StocksWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

export default function StocksWidget({
  onClose,
  defaultPosition = { x: 120, y: 120 },
  zIndex,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
}: StocksWidgetProps) {
  const isLight = theme === "light";
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "crypto">("overview");
  const [status, setStatus] = useState<"loading" | "live" | "offline">(
    "loading",
  );
  const [flashStates, setFlashStates] = useState<
    Record<string, "up" | "down" | "flat" | null>
  >({});
  const prevPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/quotes");
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        if (cancelled) return;
        const quotes: TickerData[] = data.quotes ?? [];
        setTickers((prev) => {
          const next = quotes.length ? quotes : prev;
          for (const t of next) {
            const prevPrice = prevPrices.current[t.symbol];
            if (prevPrice !== undefined && prevPrice !== t.price) {
              const dir = t.price > prevPrice ? "up" : "down";
              setFlashStates((f) => ({ ...f, [t.symbol]: dir }));
              setTimeout(() => {
                setFlashStates((f) => ({ ...f, [t.symbol]: null }));
              }, 800);
            }
            prevPrices.current[t.symbol] = t.price;
          }
          return next;
        });
        setStatus(quotes.length ? "live" : "offline");
      } catch {
        if (!cancelled) setStatus((s) => (s === "loading" ? "offline" : s));
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filteredTickers = tickers.filter((t) => t.category === activeTab);

  return (
    <FloatingWindow
      title="MARKETS TELEMETRY"
      theme={theme}
      layoutMode={layoutMode}
      icon={
        <span
          className={`relative flex h-2 w-2 ${
            status === "offline" ? "opacity-50" : ""
          }`}
        >
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
              status === "offline" ? "bg-red-400" : "bg-green-400"
            } opacity-75`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status === "offline" ? "bg-red-500" : "bg-green-500"
            }`}
          ></span>
        </span>
      }
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={{ width: 320, height: 420 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div
        className={`w-full h-full flex flex-col min-h-0 font-mono ${
          isLight ? "bg-white text-slate-900" : "bg-black/40 text-slate-200"
        }`}
      >
        {/* Subheader tab bar buttons */}
        <div
          className={`flex p-1 gap-1 text-[9px] font-bold shrink-0 border-b ${
            isLight
              ? "bg-slate-100 border-slate-200"
              : "bg-[#07070a] border-[#222]"
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-1 rounded text-center transition-all ${
              activeTab === "overview"
                ? isLight
                  ? "bg-cyan-100 border border-cyan-400 text-cyan-900 font-bold shadow-sm"
                  : "bg-[#18181b] border border-[#333] text-cyan-400"
                : isLight
                  ? "text-slate-600 hover:text-slate-900 border border-transparent"
                  : "text-slate-500 hover:text-slate-350 border border-transparent"
            }`}
          >
            OVERVIEW
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("crypto")}
            className={`flex-1 py-1 rounded text-center transition-all ${
              activeTab === "crypto"
                ? isLight
                  ? "bg-cyan-100 border border-cyan-400 text-cyan-900 font-bold shadow-sm"
                  : "bg-[#18181b] border border-[#333] text-cyan-400"
                : isLight
                  ? "text-slate-600 hover:text-slate-900 border border-transparent"
                  : "text-slate-500 hover:text-slate-350 border border-transparent"
            }`}
          >
            CRYPTO
          </button>
        </div>

        {/* Status line */}
        <div
          className={`px-2 py-0.5 text-[8px] font-bold tracking-widest uppercase shrink-0 border-b ${
            isLight
              ? "bg-slate-50 border-slate-200 text-slate-500"
              : "bg-[#0a0a0c] border-[#222] text-slate-600"
          }`}
        >
          {status === "loading"
            ? "ESTABLISHING MARKET UPLINK..."
            : status === "live"
              ? "LIVE · YAHOO FINANCE"
              : "FEED OFFLINE · LAST SNAPSHOT"}
        </div>

        {/* Grid content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 text-xs">
          {filteredTickers.length === 0 && (
            <div className="text-[10px] text-slate-500 font-bold tracking-widest text-center py-8">
              {status === "loading"
                ? "ACQUIRING QUOTES..."
                : "NO MARKET DATA AVAILABLE"}
            </div>
          )}
          {filteredTickers.map((t) => {
            const isUp = t.changePercent >= 0;
            const flash = flashStates[t.symbol];

            let flashClass = "";
            if (!t.ok) {
              flashClass = isLight
                ? "border-slate-200 bg-slate-50 opacity-60"
                : "border-transparent bg-transparent opacity-60";
            } else if (flash === "up") {
              flashClass = isLight
                ? "bg-green-100 border-green-400 text-green-800"
                : "bg-green-500/20 border-green-500/40 text-green-300";
            } else if (flash === "down") {
              flashClass = isLight
                ? "bg-red-100 border-red-400 text-red-800"
                : "bg-red-500/20 border-red-500/40 text-red-300";
            } else {
              flashClass = isLight
                ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                : "border-transparent bg-transparent";
            }

            return (
              <div
                key={t.symbol}
                className={`flex items-center justify-between p-2 rounded border transition-all duration-300 ${flashClass}`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-bold text-[11px] ${
                        isLight ? "text-slate-900" : "text-white"
                      }`}
                    >
                      {t.symbol}
                    </span>
                    <span
                      className={`text-[9px] truncate ${
                        isLight
                          ? "text-slate-500 font-medium"
                          : "text-slate-500"
                      }`}
                    >
                      {t.name}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <div
                    className={`font-bold text-[11px] tabular-nums ${
                      isLight ? "text-slate-900" : "text-slate-200"
                    }`}
                  >
                    {t.ok
                      ? t.price.toLocaleString("en-US", {
                          minimumFractionDigits: t.symbol === "DOGE" ? 4 : 2,
                        })
                      : "—"}
                  </div>
                  {t.ok && (
                    <div
                      className={`text-[10px] font-bold tabular-nums ${
                        isUp
                          ? isLight
                            ? "text-green-700"
                            : "text-green-500"
                          : isLight
                            ? "text-red-700"
                            : "text-red-500"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {t.changePercent.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </FloatingWindow>
  );
}
