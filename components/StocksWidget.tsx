"use client";

import { useEffect, useState } from "react";
import FloatingWindow from "./FloatingWindow";

interface TickerData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  category: "overview" | "crypto";
}

interface StocksWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

const INITIAL_TICKERS: TickerData[] = [
  {
    symbol: "SPX",
    name: "S&P 500 Index",
    price: 5432.12,
    change: 12.4,
    changePercent: 0.23,
    direction: "up",
    category: "overview",
  },
  {
    symbol: "IXIC",
    name: "Nasdaq Composite",
    price: 17688.35,
    change: -45.1,
    changePercent: -0.25,
    direction: "down",
    category: "overview",
  },
  {
    symbol: "DJI",
    name: "Dow Jones Industrial",
    price: 39120.45,
    change: 88.2,
    changePercent: 0.22,
    direction: "up",
    category: "overview",
  },
  {
    symbol: "CL1!",
    name: "Crude Oil Futures",
    price: 81.34,
    change: 0.45,
    changePercent: 0.56,
    direction: "up",
    category: "overview",
  },
  {
    symbol: "GC1!",
    name: "Gold Futures",
    price: 2322.8,
    change: -12.4,
    changePercent: -0.53,
    direction: "down",
    category: "overview",
  },
  {
    symbol: "BTC",
    name: "Bitcoin / USD",
    price: 61850.0,
    change: 420.0,
    changePercent: 0.68,
    direction: "up",
    category: "crypto",
  },
  {
    symbol: "ETH",
    name: "Ethereum / USD",
    price: 3380.5,
    change: -15.4,
    changePercent: -0.45,
    direction: "down",
    category: "crypto",
  },
  {
    symbol: "SOL",
    name: "Solana / USD",
    price: 136.25,
    change: 3.12,
    changePercent: 2.34,
    direction: "up",
    category: "crypto",
  },
  {
    symbol: "DOGE",
    name: "Dogecoin / USD",
    price: 0.124,
    change: 0.005,
    changePercent: 4.2,
    direction: "up",
    category: "crypto",
  },
];

export default function StocksWidget({
  onClose,
  defaultPosition = { x: 120, y: 120 },
  zIndex,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
}: StocksWidgetProps) {
  const isLight = theme === "light";
  const [tickers, setTickers] = useState<TickerData[]>(INITIAL_TICKERS);
  const [activeTab, setActiveTab] = useState<"overview" | "crypto">("overview");
  const [flashStates, setFlashStates] = useState<
    Record<string, "up" | "down" | "flat" | null>
  >({});

  useEffect(() => {
    const interval = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => {
          const changePercentDelta = Math.random() * 0.4 - 0.2;
          const deltaPrice = t.price * (changePercentDelta / 100);
          const nextPrice = t.price + deltaPrice;
          const nextChange = t.change + deltaPrice;
          const nextPercent = t.changePercent + changePercentDelta;
          const direction =
            deltaPrice > 0 ? "up" : deltaPrice < 0 ? "down" : t.direction;

          setFlashStates((prevFlash) => ({
            ...prevFlash,
            [t.symbol]: direction,
          }));

          setTimeout(() => {
            setFlashStates((prevFlash) => ({
              ...prevFlash,
              [t.symbol]: null,
            }));
          }, 800);

          return {
            ...t,
            price: Number(
              nextPrice.toFixed(t.category === "crypto" && t.price < 1 ? 4 : 2),
            ),
            change: Number(
              nextChange.toFixed(
                t.category === "crypto" && t.price < 1 ? 4 : 2,
              ),
            ),
            changePercent: Number(nextPercent.toFixed(2)),
            direction,
          };
        }),
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const filteredTickers = tickers.filter((t) => t.category === activeTab);

  return (
    <FloatingWindow
      title="MARKETS TELEMETRY"
      theme={theme}
      layoutMode={layoutMode}
      icon={
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
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

        {/* Grid content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 text-xs">
          {filteredTickers.map((t) => {
            const isUp = t.changePercent >= 0;
            const flash = flashStates[t.symbol];

            let flashClass = "";
            if (flash === "up")
              flashClass = isLight
                ? "bg-green-100 border-green-400 text-green-800"
                : "bg-green-500/20 border-green-500/40 text-green-300";
            else if (flash === "down")
              flashClass = isLight
                ? "bg-red-100 border-red-400 text-red-800"
                : "bg-red-500/20 border-red-500/40 text-red-300";
            else
              flashClass = isLight
                ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                : "border-transparent bg-transparent";

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
                    {t.price.toLocaleString("en-US", {
                      minimumFractionDigits: t.symbol === "DOGE" ? 4 : 2,
                    })}
                  </div>
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </FloatingWindow>
  );
}
