"use client";

import { useEffect, useState } from "react";

/**
 * True on phone-width viewports. Single source of truth for the breakpoint so
 * the shell, the panels and the palette can't drift apart on where "mobile"
 * starts. Matches Tailwind's `md` (768px).
 *
 * Returns false during SSR and the first client render, so anything gated on it
 * must degrade to the desktop layout rather than to nothing.
 */
export function useIsMobile(query = "(max-width: 767px)"): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return isMobile;
}
