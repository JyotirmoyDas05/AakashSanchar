"use client";

import { useEffect, useRef, useState } from "react";
import { extractTitleFromUrl } from "@/lib/articleTitle";
import { deriveTag } from "@/lib/deriveTags";
import { detectSourceLang } from "@/lib/detectLang";
import { bucketForTag } from "@/lib/tagPalette";
import type { NewsEvent } from "@/types/news";

function tagBadgeClasses(bucket: string, isLight: boolean): string {
  if (bucket === "conflict")
    return "text-red-500 bg-red-500/10 border-red-500/25";
  if (bucket === "disaster")
    return "text-orange-500 bg-orange-500/10 border-orange-500/25";
  if (bucket === "health")
    return "text-purple-500 bg-purple-500/10 border-purple-500/25";
  if (bucket === "space")
    return "text-cyan-500 bg-cyan-500/10 border-cyan-500/25";
  return isLight
    ? "text-slate-600 bg-slate-100 border-slate-300"
    : "text-slate-400 bg-slate-500/10 border-slate-500/25";
}

interface ExternalLinkModalProps {
  url: string;
  onCancel: () => void;
  onContinue: () => void;
  theme?: "dark" | "light";
}

function ExternalLinkModal({
  url,
  onCancel,
  onContinue,
  theme = "dark",
}: ExternalLinkModalProps) {
  const isLight = theme === "light";
  let domain = url;
  try {
    domain = new URL(url).hostname.replace("www.", "");
  } catch {
    // keep raw
  }

  let formattedUrl = url.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-xl animate-backdrop-fade"
      onClick={onCancel}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.05) 100%)",
        }}
      />

      <div
        className={`relative z-10 w-full max-w-sm mx-4 rounded-xl border font-mono select-none overflow-hidden animate-modal-pop ${
          isLight
            ? "border-slate-300 bg-white text-slate-900 shadow-2xl"
            : "border-[#2a2a2e] bg-[#0b0c0e]/98 text-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center gap-2 px-4 py-3 border-b rounded-t-xl ${
            isLight
              ? "bg-slate-100 border-slate-200"
              : "bg-[#0d0d0e] border-[#222]"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-orange-400 shrink-0 shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
          <span
            className={`text-[10px] font-bold tracking-widest uppercase ${
              isLight ? "text-slate-800" : "text-slate-400"
            }`}
          >
            External Link Warning
          </span>
        </div>

        {/* Body */}
        <div className="px-4 pt-4 pb-3 space-y-3">
          <p
            className={`text-xs leading-relaxed ${
              isLight ? "text-slate-800" : "text-slate-300"
            }`}
          >
            You are about to leave this site and visit an external source.
          </p>
          <div
            className={`rounded-md border px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap ${
              isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-black/50 border-[#222]"
            }`}
          >
            <span
              className={`text-xs font-mono font-bold ${
                isLight ? "text-cyan-700" : "text-cyan-400"
              }`}
            >
              {domain}
            </span>
          </div>
          <p
            className={`text-[10px] leading-relaxed ${
              isLight ? "text-slate-500 font-medium" : "text-slate-500"
            }`}
          >
            The content of the linked page is outside our control.
          </p>
        </div>

        {/* Action Buttons */}
        <div
          className={`flex border-t ${
            isLight ? "border-slate-200" : "border-[#222]"
          }`}
        >
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase rounded-bl-xl transition-all active:scale-[0.98] cursor-pointer ${
              isLight
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border-r border-slate-200"
                : "bg-[#0d0d0e] text-slate-400 hover:bg-[#18181c] hover:text-slate-200 border-r border-[#222]"
            }`}
          >
            Cancel
          </button>
          <a
            href={formattedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              setTimeout(onContinue, 100);
            }}
            className="flex-1 py-2.5 text-[10px] text-center font-bold tracking-widest text-black bg-cyan-500 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all uppercase rounded-br-xl active:scale-[0.98] cursor-pointer"
          >
            Continue
          </a>
        </div>
      </div>
    </div>
  );
}

interface HotspotCardProps {
  event: NewsEvent;
  onClose: () => void;
  position?: { x: number; y: number } | null;
  theme?: "dark" | "light";
}

export default function HotspotCard({
  event,
  onClose,
  position,
  theme = "dark",
}: HotspotCardProps) {
  const isLight = theme === "light";
  const [fullTitle, setFullTitle] = useState<string>(
    () => extractTitleFromUrl(event.url) || event.title,
  );
  const [translated, setTranslated] = useState(false);

  const [isTranslating, setIsTranslating] = useState(false);
  const [translateState, setTranslateState] = useState<
    "idle" | "english" | "unavailable"
  >("idle");
  const [externalLink, setExternalLink] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const externalLinkRef = useRef<string | null>(null);
  externalLinkRef.current = externalLink;

  useEffect(() => {
    const initial = extractTitleFromUrl(event.url) || event.title;
    setFullTitle(initial);

    if (!event.url || event.url === "#") return;

    let isMounted = true;
    fetch(`/api/article-title?url=${encodeURIComponent(event.url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.title) {
          setFullTitle(data.title);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [event.url, event.title]);

  // After translation, re-derive tag from English so Tamil/Burmese "General" becomes topic-correct
  const displayTagRaw = (() => {
    if (translated) {
      try {
        const d = deriveTag(fullTitle, event.description, event.source);
        if (d.tag !== "General") return d.tag;
      } catch {}
    }
    return event.tag ?? event.category;
  })();
  const bucket = bucketForTag(displayTagRaw);
  const tagLabel = displayTagRaw.toUpperCase();

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (externalLinkRef.current) return;
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  async function handleTranslate() {
    if (translated || isTranslating) return;

    const from = detectSourceLang(fullTitle);
    if (!from) {
      setTranslateState("english");
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch(
        `/api/translate?text=${encodeURIComponent(
          fullTitle,
        )}&from=${from}&to=en`,
      );
      if (!res.ok) throw new Error("translate failed");
      const data = await res.json();
      if (data?.translated && data.text && data.text !== fullTitle) {
        setFullTitle(data.text);
        setTranslated(true);
      } else {
        setTranslateState("english");
      }
    } catch {
      setTranslateState("unavailable");
    } finally {
      setIsTranslating(false);
    }
  }

  const dateStr = (() => {
    try {
      const d = new Date(event.publishedAt);
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  })();

  const cardStyle: React.CSSProperties = position
    ? {
        position: "fixed",
        left: position.x,
        top: position.y,
        transform: "translate(-50%, calc(-100% - 14px))",
        zIndex: 2000,
      }
    : {
        position: "fixed",
        left: "50%",
        top: "40%",
        transform: "translate(-50%, -50%)",
        zIndex: 2000,
      };

  return (
    <>
      {externalLink && (
        <ExternalLinkModal
          url={externalLink}
          theme={theme}
          onCancel={() => setExternalLink(null)}
          onContinue={() => setExternalLink(null)}
        />
      )}

      <div
        ref={cardRef}
        style={cardStyle}
        className={`w-80 rounded-lg border font-mono select-none ${
          isLight
            ? "border-slate-300 bg-white text-slate-900 shadow-xl"
            : "border-[#222] bg-brand-bg/95 text-slate-200 shadow-2xl backdrop-blur-md"
        }`}
      >
        {/* Tags row — single dynamic topic chip (keeps minimal 9px pill style) */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border rounded ${tagBadgeClasses(bucket, isLight)}`}
            >
              {tagLabel}
            </span>
            <button
              type="button"
              onClick={handleTranslate}
              disabled={
                translated ||
                isTranslating ||
                translateState === "english" ||
                translateState === "unavailable"
              }
              className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border rounded transition-colors ${
                translated
                  ? isLight
                    ? "text-cyan-800 bg-cyan-100 border-cyan-300 font-bold"
                    : "text-cyan-400 bg-cyan-500/10 border-cyan-500/25"
                  : translateState === "english" ||
                      translateState === "unavailable"
                    ? isLight
                      ? "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed"
                      : "text-slate-600 bg-transparent border-[#222] cursor-not-allowed"
                    : isLight
                      ? "text-slate-600 bg-slate-100 border-slate-300 hover:text-cyan-800 hover:border-cyan-400"
                      : "text-slate-400 bg-transparent border-[#333] hover:text-cyan-400 hover:border-cyan-500/40"
              }`}
            >
              {isTranslating
                ? "···"
                : translated
                  ? "TRANSLATED"
                  : translateState === "english"
                    ? "ENGLISH"
                    : translateState === "unavailable"
                      ? "UNAVAILABLE"
                      : "TRANSLATE"}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`transition-colors p-0.5 -mr-1 shrink-0 ml-1 ${
              isLight
                ? "text-slate-500 hover:text-slate-900"
                : "text-slate-600 hover:text-slate-300"
            }`}
            aria-label="Close"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 1l9 9M10 1L1 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Location mention — for RSS markers we label as reported-from to avoid "mentioned" false-positives */}
        <div className="px-3 pb-1">
          <p
            className={`text-[10px] font-bold tracking-wide ${
              isLight ? "text-cyan-700" : "text-cyan-500"
            }`}
          >
            {event.id.startsWith("rss-")
              ? `Reported from ${event.locationName}:`
              : `${event.locationName} mentioned in article:`}
          </p>
        </div>

        {/* Article title */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => event.url && setExternalLink(event.url)}
            className={`text-left text-sm font-bold leading-snug transition-colors cursor-pointer ${
              isLight
                ? "text-slate-900 hover:text-cyan-800"
                : "text-slate-100 hover:text-cyan-400"
            }`}
          >
            {fullTitle}
          </button>
        </div>

        {/* Footer */}
        <div
          className={`px-3 py-2 border-t flex items-center gap-1.5 ${
            isLight
              ? "border-slate-200 text-slate-600 font-medium"
              : "border-brand-border text-slate-600"
          }`}
        >
          <span className="text-[10px]">{dateStr}</span>
          {event.source && (
            <>
              <span className="text-[10px]">|</span>
              <span className="text-[10px]">{event.source}</span>
            </>
          )}
        </div>

        {/* Down-pointing arrow tip */}
        {position && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full pointer-events-none">
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: `7px solid ${isLight ? "#cbd5e1" : "#222"}`,
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
