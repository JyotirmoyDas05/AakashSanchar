"use client";

import { formatTime } from "@/lib/formatTime";
import type { NewsCategory, NewsEvent } from "@/types/news";

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  politics: "bg-amber-100 text-amber-800",
  business: "bg-blue-100 text-blue-800",
  tech: "bg-purple-100 text-purple-800",
  sports: "bg-green-100 text-green-800",
  disaster: "bg-red-100 text-red-800",
  general: "bg-zinc-100 text-zinc-800",
};

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  politics: "Politics",
  business: "Business",
  tech: "Tech",
  sports: "Sports",
  disaster: "Disaster",
  general: "General",
};

interface EventDetailsPanelProps {
  event: NewsEvent | null;
  onClose: () => void;
}

export default function EventDetailsPanel({
  event,
  onClose,
}: EventDetailsPanelProps) {
  if (!event) return null;

  return (
    <div className="flex h-full flex-col border-l bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Event Details
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Close panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            role="img"
            aria-label="Close"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h3 className="text-lg font-semibold leading-snug">{event.title}</h3>

        <p className="mt-1 text-sm text-zinc-500">{event.source}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[event.category]}`}
          >
            {CATEGORY_LABELS[event.category]}
          </span>
          <span className="text-xs text-zinc-400">
            {formatTime(event.publishedAt)}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Location
            </span>
            <p className="mt-0.5 text-sm text-zinc-700">{event.locationName}</p>
            <p className="text-xs text-zinc-400">
              {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
            </p>
          </div>

          <div>
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Intensity
            </span>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: `${event.intensity * 100}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-zinc-500">
                {(event.intensity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
