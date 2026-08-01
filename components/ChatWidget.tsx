"use client";

import { useEffect, useRef, useState } from "react";
import FloatingWindow from "./FloatingWindow";

interface MessageItem {
  id: string;
  user: string;
  text: string;
  time: string;
  badge?: string;
  badgeColor?: string;
}

interface ChatWidgetProps {
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
  layoutMode?: "sidebar" | "floating";
}

const CHANNELS = ["#lobby", "#general", "#markets", "#geopolitics"];

const MOCK_BOT_RESPONSES = [
  {
    user: "intel-relay",
    text: "Strait of Hormuz coordinates updated. Multi-vessel patrols confirmed.",
    badge: "RELAY",
    badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
  {
    user: "anon-492",
    text: "NH9 Nhava Sheva backup power grids are still down. Massive container queues.",
    badge: "ANON",
    badgeColor: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
  {
    user: "grid-op",
    text: "Analyzing Zaporizhzhia thermal cameras. Explosion footprint localized.",
    badge: "OPERATOR",
    badgeColor: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  {
    user: "crypto-bull",
    text: "SOL support line holds strong at 135. Accumulating here.",
    badge: "MARKETS",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  {
    user: "system-bot",
    text: "Threat level current status: DEFCON 3 (ROUND HOUSE). Surveillance scanners alert.",
    badge: "SYSTEM",
    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
];

export default function ChatWidget({
  onClose,
  defaultPosition = { x: 240, y: 240 },
  zIndex,
  onFocus,
  layoutMode = "sidebar",
}: ChatWidgetProps) {
  const [activeChannel, setActiveChannel] = useState("#lobby");
  const [messages, setMessages] = useState<Record<string, MessageItem[]>>({
    "#lobby": [
      {
        id: "m-1",
        user: "system-relay",
        text: "Anonymous secure connection established. Welcome to #lobby.",
        time: "22:15",
        badge: "SYSTEM",
        badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      },
      {
        id: "m-2",
        user: "anon-121",
        text: "Anyone watching the earthquake reports off Venezuela? Major tremor registered.",
        time: "22:16",
        badge: "ANON",
        badgeColor: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      },
      {
        id: "m-3",
        user: "seismic-bot",
        text: "M6.2 epicenter coordinates: 10.600° N, -66.800° E. Shallow fault rupture verified.",
        time: "22:17",
        badge: "BOT",
        badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      },
    ],
    "#general": [
      {
        id: "mg-1",
        user: "system-relay",
        text: "Lobby channel #general loaded.",
        time: "22:10",
        badge: "SYSTEM",
        badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      },
    ],
    "#markets": [
      {
        id: "mm-1",
        user: "stocks-tracker",
        text: "S&P 500 futures trade +0.23% in morning swaps.",
        time: "22:05",
        badge: "BOT",
        badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      },
    ],
    "#geopolitics": [
      {
        id: "mp-1",
        user: "osint-alpha",
        text: "Satellite pass detects military vehicle columns moving near border checkpoint.",
        time: "21:58",
        badge: "OSINT",
        badgeColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      },
    ],
  });

  const [inputVal, setInputVal] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleSend = () => {
    if (!inputVal.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      user: "guest-391",
      text: inputVal,
      time: timeStr,
      badge: "GUEST",
      badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), userMsg],
    }));
    setInputVal("");

    // Simulate automated reply on a random delay (1-2s)
    setTimeout(() => {
      const response =
        MOCK_BOT_RESPONSES[
          Math.floor(Math.random() * MOCK_BOT_RESPONSES.length)
        ];
      const botTime = new Date();
      const botTimeStr = `${botTime.getHours().toString().padStart(2, "0")}:${botTime.getMinutes().toString().padStart(2, "0")}`;
      const botMsg: MessageItem = {
        id: `b-${Date.now()}`,
        user: response.user,
        text: response.text,
        time: botTimeStr,
        badge: response.badge,
        badgeColor: response.badgeColor,
      };

      setMessages((prev) => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), botMsg],
      }));
    }, 1500);
  };

  return (
    <FloatingWindow
      title="ANONYMOUS SECURE CHAT"
      layoutMode={layoutMode}
      icon={
        <svg
          className="h-4.5 w-4.5 text-cyan-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      }
      onClose={onClose}
      defaultPosition={defaultPosition}
      defaultSize={{ width: 480, height: 350 }}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div className="w-full h-full text-slate-200 font-mono select-none flex flex-col bg-black/40">
        {/* Grid container with channel rail + messages feed */}
        <div className="flex flex-1 min-h-0">
          {/* Channels sidebar list */}
          <div className="w-27.5 border-r border-[#222] bg-[#070709] p-1.5 space-y-1 overflow-y-auto shrink-0">
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setActiveChannel(ch)}
                className={`w-full rounded text-left px-2 py-1 text-[10px] font-bold ${
                  ch === activeChannel
                    ? "bg-brand-border text-cyan-400 border border-slate-700/50"
                    : "text-slate-500 hover:text-slate-355"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          {/* Message Logs Feed */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#020202]">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-2.5 space-y-2.5 text-[10px] font-sans"
            >
              {(messages[activeChannel] || []).map((m) => (
                <div key={m.id} className="space-y-0.5 leading-normal">
                  {/* Username block */}
                  <div className="flex items-center gap-1.5 select-text text-[9px]">
                    <span className="font-mono text-slate-550">{m.time}</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {m.user}
                    </span>
                    {m.badge && (
                      <span
                        className={`text-[8px] font-mono px-1 rounded border leading-none py-0.5 ${m.badgeColor}`}
                      >
                        {m.badge}
                      </span>
                    )}
                  </div>
                  {/* Message text */}
                  <p className="text-slate-300 font-sans text-xs whitespace-pre-wrap select-text pl-1 border-l border-slate-800">
                    {m.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Form write input */}
            <div className="border-t border-[#222] p-1.5 flex gap-1.5 bg-[#070709] shrink-0">
              <input
                type="text"
                placeholder="Send message to channel..."
                className="flex-1 rounded border border-[#222] bg-black/60 px-2 py-1 text-xs text-slate-200 placeholder-slate-650 outline-none focus:border-cyan-500 font-sans"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                className="rounded bg-[#0d0d0e] hover:bg-[#18181b] border border-[#222] px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:text-white shrink-0"
              >
                SEND
              </button>
            </div>
          </div>
        </div>
      </div>
    </FloatingWindow>
  );
}
