"use client";

import FloatingWindow from "./FloatingWindow";

interface OutbreakItem {
  id: string;
  pathogen: string;
  location: string;
  cases: number;
  deaths: number;
  cfr: string; // Case Fatality Rate
}

interface OutbreaksWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  theme?: "dark" | "light";
  layoutMode?: "sidebar" | "floating";
}

const OUTBREAKS: OutbreakItem[] = [
  {
    id: "outb-1",
    pathogen: "Ebola (Sudan Strain)",
    location: "Bundibugyo, Uganda",
    cases: 28,
    deaths: 16,
    cfr: "57.1%",
  },
  {
    id: "outb-2",
    pathogen: "Hantavirus (Shipboard)",
    location: "Miami Harbor, FL",
    cases: 14,
    deaths: 5,
    cfr: "35.7%",
  },
  {
    id: "outb-3",
    pathogen: "Avian Influenza (H5N1)",
    location: "Tokyo, Japan",
    cases: 8,
    deaths: 4,
    cfr: "50.0%",
  },
  {
    id: "outb-4",
    pathogen: "Lassa Fever (Rural)",
    location: "Edo State, Nigeria",
    cases: 84,
    deaths: 18,
    cfr: "21.4%",
  },
  {
    id: "outb-5",
    pathogen: "Marburg Virus",
    location: "Kigali, Rwanda",
    cases: 3,
    deaths: 2,
    cfr: "66.7%",
  },
];

export default function OutbreaksWidget({
  onClose,
  defaultPosition = { x: 220, y: 220 },
  zIndex,
  onFocus,
  theme = "dark",
  layoutMode = "sidebar",
}: OutbreaksWidgetProps) {
  const isLight = theme === "light";

  return (
    <FloatingWindow
      title="EPIDEMIOLOGICAL MONITOR"
      theme={theme}
      layoutMode={layoutMode}
      icon={
        <svg
          className="h-4.5 w-4.5 text-rose-500 animate-pulse"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      }
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={{ width: 384, height: 320 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div
        className={`w-full h-full font-mono flex flex-col justify-between min-h-0 ${
          isLight ? "bg-white text-slate-900" : "bg-black/40 text-slate-200"
        }`}
      >
        {/* Outbreaks table view */}
        <div className="p-2.5 flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-left text-[10px] font-mono leading-normal border-collapse">
            <thead>
              <tr
                className={`border-b font-bold uppercase tracking-wider ${
                  isLight
                    ? "border-slate-200 text-slate-700"
                    : "border-[#222] text-slate-500"
                }`}
              >
                <th className="pb-2">PATHOGEN / VIRUS</th>
                <th className="pb-2">LOCATION</th>
                <th className="pb-2 text-right">CASES</th>
                <th className="pb-2 text-right">DEATHS</th>
                <th className="pb-2 text-right">CFR</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isLight ? "divide-slate-200" : "divide-[#222]/40"
              }`}
            >
              {OUTBREAKS.map((o) => (
                <tr
                  key={o.id}
                  className={`transition-colors ${
                    isLight ? "hover:bg-slate-50" : "hover:bg-brand-border/20"
                  }`}
                >
                  <td
                    className={`py-2.5 font-bold ${
                      isLight ? "text-slate-900" : "text-slate-200"
                    }`}
                  >
                    {o.pathogen}
                  </td>
                  <td
                    className={`py-2.5 truncate max-w-22.5 ${
                      isLight ? "text-slate-600 font-medium" : "text-slate-400"
                    }`}
                  >
                    {o.location}
                  </td>
                  <td
                    className={`py-2.5 text-right tabular-nums ${
                      isLight ? "text-slate-900 font-bold" : "text-slate-300"
                    }`}
                  >
                    {o.cases}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-red-600 font-bold">
                    {o.deaths}
                  </td>
                  <td
                    className={`py-2.5 text-right tabular-nums font-bold ${
                      isLight ? "text-rose-700" : "text-rose-400"
                    }`}
                  >
                    {o.cfr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer warning */}
        <div
          className={`border-t px-3 py-2 text-[9px] font-bold leading-normal text-center shrink-0 ${
            isLight
              ? "bg-red-50 text-red-700 border-slate-200"
              : "bg-[#220d0d]/35 text-red-400 border-[#222]"
          }`}
        >
          WARNING: SCREEN FOR GLOBAL HIGH-THREAT PATHOGENS ACTIVE
        </div>
      </div>
    </FloatingWindow>
  );
}
