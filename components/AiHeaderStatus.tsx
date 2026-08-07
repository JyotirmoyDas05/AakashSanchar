"use client";

import { useEffect, useState } from "react";
import { getWebLLMEngine, isWebLLMSupported } from "@/lib/webLLM";
import { SolvingOrb } from "./SolvingOrb";

export default function AiHeaderStatus({
  theme = "dark",
}: {
  theme?: "dark" | "light";
}) {
  const isLight = theme === "light";
  const [status, setStatus] = useState<string>("AI idle");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isWebLLMSupported()) {
      setStatus("AI unavailable");
      return;
    }
    // Defer to idle so page doesn't lag
    const run = () => {
      setStatus("AI downloading (0.9GB, cached)...");
      getWebLLMEngine((text) => {
        // Throttle updates to avoid spam
        if (
          text.includes("Loading") ||
          text.includes("Fetching") ||
          text.includes("%")
        ) {
          setStatus(text.slice(0, 40));
        }
      })
        .then(() => {
          setStatus("AI ready");
          setReady(true);
        })
        .catch(() => {
          setStatus("AI template");
        });
    };
    const idle = (
      window as unknown as { requestIdleCallback?: (cb: () => void) => number }
    ).requestIdleCallback;
    let id: number | undefined;
    if (idle) id = idle(run);
    else setTimeout(run, 1500);

    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ text: string; ready?: boolean }>;
      if (ce.detail?.text) setStatus(ce.detail.text.slice(0, 36));
      if (ce.detail?.ready) setReady(true);
    };
    window.addEventListener("ai-status", handler as EventListener);
    return () => {
      window.removeEventListener("ai-status", handler as EventListener);
      if (
        id &&
        (window as unknown as { cancelIdleCallback?: (id: number) => void })
          .cancelIdleCallback
      ) {
        (
          window as unknown as { cancelIdleCallback: (id: number) => void }
        ).cancelIdleCallback?.(id);
      }
    };
  }, []);

  return (
    <span
      className={`hidden md:inline-flex items-center gap-1.5 text-[9px] font-mono px-2 py-0.5 rounded border ${
        ready
          ? isLight
            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          : isLight
            ? "text-slate-500 bg-slate-100 border-slate-200"
            : "text-slate-500 bg-white/5 border-white/10"
      }`}
      title={status}
    >
      {ready ? (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      ) : (
        <SolvingOrb size={12} color={[251, 191, 36]} dark={!isLight} />
      )}
      {status.toUpperCase()}
    </span>
  );
}
