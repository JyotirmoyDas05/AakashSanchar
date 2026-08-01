"use client";

import { useEffect, useRef, useState } from "react";
import { labelForCategory } from "@/lib/filterEvents";
import type { NewsEvent } from "@/types/news";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  events: NewsEvent[];
  onEventSelect: (eventId: string, coords: [number, number]) => void;
  theme?: "dark" | "light";
}

export default function CommandPalette({
  isOpen,
  onClose,
  events,
  onEventSelect,
  theme = "dark",
}: CommandPaletteProps) {
  const isLight = theme === "light";
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.locationName.toLowerCase().includes(search.toLowerCase()) ||
      e.source.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (scrollContainerRef.current) {
      const selectedEl = scrollContainerRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedEl) {
        const container = scrollContainerRef.current;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elemTop = selectedEl.offsetTop;
        const elemBottom = elemTop + selectedEl.clientHeight;

        if (elemTop < containerTop) {
          container.scrollTop = elemTop;
        } else if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight;
        }
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev + 1) % Math.max(1, filteredEvents.length),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredEvents.length) %
            Math.max(1, filteredEvents.length),
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredEvents[selectedIndex]) {
          const ev = filteredEvents[selectedIndex];
          onEventSelect(ev.id, [ev.lat, ev.lng]);
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredEvents, selectedIndex, onEventSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-start justify-center bg-black/50 pt-[10dvh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 slide-in-from-top-4 ${
          isLight
            ? "border-slate-300 bg-white text-slate-900"
            : "border-brand-border bg-[#0b101c]/95 text-slate-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          className={`flex items-center border-b px-4 py-3 ${
            isLight ? "border-slate-200" : "border-brand-border"
          }`}
        >
          <svg
            className={`h-5 w-5 mr-3 ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={`flex-1 bg-transparent text-sm outline-none ${
              isLight
                ? "text-slate-900 placeholder-slate-500"
                : "text-slate-100 placeholder-slate-500"
            }`}
            placeholder="Search events, locations, summaries... (Esc to close)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div
            className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${
              isLight
                ? "bg-slate-100 text-slate-700 border-slate-300"
                : "bg-brand-border text-slate-400 border-slate-700"
            }`}
          >
            ESC
          </div>
        </div>

        {/* Results List */}
        <div
          ref={scrollContainerRef}
          className="max-h-87.5 overflow-y-auto p-2"
        >
          {filteredEvents.length === 0 ? (
            <div
              className={`py-8 text-center text-sm font-mono ${
                isLight ? "text-slate-500" : "text-slate-500"
              }`}
            >
              NO MATCHING CORRELATIONS DETECTED
            </div>
          ) : (
            filteredEvents.map((ev, idx) => {
              const isSelected = idx === selectedIndex;
              const catLabel = labelForCategory(ev.category);

              let catGlowColor = "bg-slate-500";
              if (ev.category === "news") catGlowColor = "bg-cat-news";
              else if (ev.category === "conflict")
                catGlowColor = "bg-cat-conflict";
              else if (ev.category === "disaster")
                catGlowColor = "bg-cat-disaster";
              else if (ev.category === "health") catGlowColor = "bg-cat-health";
              else if (ev.category === "space") catGlowColor = "bg-cat-space";

              return (
                <div
                  key={ev.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors ${
                    isSelected
                      ? isLight
                        ? "bg-cyan-100 text-cyan-950 border border-cyan-400 font-bold shadow-sm"
                        : "bg-brand-border text-white border border-brand-border-glow/50"
                      : isLight
                        ? "text-slate-800 hover:bg-slate-100 border border-transparent"
                        : "text-slate-300 hover:bg-brand-border/40 border border-transparent"
                  }`}
                  onClick={() => {
                    onEventSelect(ev.id, [ev.lat, ev.lng]);
                    onClose();
                  }}
                >
                  <div
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${catGlowColor}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-xs font-semibold uppercase tracking-wider ${
                          isLight
                            ? "text-slate-600 font-bold"
                            : "text-slate-400"
                        }`}
                      >
                        {catLabel} • {ev.source}
                      </span>
                      <span
                        className={`shrink-0 font-mono text-[10px] ${
                          isLight
                            ? "text-slate-600 font-bold"
                            : "text-slate-500"
                        }`}
                      >
                        {ev.lat.toFixed(3)}, {ev.lng.toFixed(3)}
                      </span>
                    </div>
                    <h4
                      className={`mt-0.5 text-sm font-semibold truncate ${
                        isLight ? "text-slate-900" : "text-slate-100"
                      }`}
                    >
                      {ev.title}
                    </h4>
                    <p
                      className={`mt-0.5 text-xs line-clamp-1 ${
                        isLight ? "text-slate-600" : "text-slate-400"
                      }`}
                    >
                      {ev.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          className={`flex items-center justify-between border-t px-4 py-2 text-[10px] font-mono ${
            isLight
              ? "bg-slate-100 border-slate-200 text-slate-700 font-bold"
              : "bg-[#080d17] border-brand-border text-slate-500"
          }`}
        >
          <span>SEARCHING {events.length} LOGS</span>
          <div className="flex gap-2">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
