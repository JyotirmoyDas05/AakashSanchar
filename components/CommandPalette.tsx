"use client";

import { useEffect, useRef, useState } from "react";
import { labelForCategory } from "@/lib/filterEvents";
import type { NewsEvent } from "@/types/news";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  events: NewsEvent[];
  onEventSelect: (eventId: string, coords: [number, number]) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  events,
  onEventSelect,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset states on toggle
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

  // Manage list scrolling to keep selected item in view
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

  // Handle keyboard navigation
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
      className="fixed inset-0 z-9999 flex items-start justify-center bg-black/60 pt-[10dvh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-brand-border bg-[#0b101c]/95 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 slide-in-from-top-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-brand-border px-4 py-3">
          <svg
            className="h-5 w-5 text-slate-400 mr-3"
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
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
            placeholder="Search events, locations, summaries... (Esc to close)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="rounded bg-brand-border px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
            ESC
          </div>
        </div>

        {/* Results List */}
        <div
          ref={scrollContainerRef}
          className="max-h-87.5 overflow-y-auto p-2"
        >
          {filteredEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 font-mono">
              NO MATCHING CORRELATIONS DETECTED
            </div>
          ) : (
            filteredEvents.map((ev, idx) => {
              const isSelected = idx === selectedIndex;
              const catLabel = labelForCategory(ev.category);

              let catGlowColor = "bg-slate-500";
              if (ev.category === "breaking") catGlowColor = "bg-cat-breaking";
              else if (ev.category === "protests")
                catGlowColor = "bg-cat-protests";
              else if (ev.category === "disasters")
                catGlowColor = "bg-cat-disasters";
              else if (ev.category === "politics")
                catGlowColor = "bg-cat-politics";
              else if (ev.category === "economy")
                catGlowColor = "bg-cat-economy";
              else if (ev.category === "tech") catGlowColor = "bg-cat-tech";

              return (
                <div
                  key={ev.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors ${
                    isSelected
                      ? "bg-brand-border text-white border border-brand-border-glow/50"
                      : "text-slate-300 hover:bg-brand-border/40 border border-transparent"
                  }`}
                  onClick={() => {
                    onEventSelect(ev.id, [ev.lat, ev.lng]);
                    onClose();
                  }}
                >
                  {/* Category dot with shadow */}
                  <div
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${catGlowColor}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {catLabel} • {ev.source}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-500">
                        {ev.lat.toFixed(3)}, {ev.lng.toFixed(3)}
                      </span>
                    </div>
                    <h4 className="mt-0.5 text-sm font-semibold truncate text-slate-100">
                      {ev.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                      {ev.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-brand-border bg-[#080d17] px-4 py-2 text-[10px] font-mono text-slate-500">
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
