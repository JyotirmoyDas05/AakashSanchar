"use client";

import { useEffect } from "react";

interface ShortcutsProps {
  onSearchToggle: () => void;
  onLayersToggle: () => void;
  onCloseActivePanel: () => void;
}

export function useKeyboardShortcuts({
  onSearchToggle,
  onLayersToggle,
  onCloseActivePanel,
}: ShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true");

      // Global Escape
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseActivePanel();
        return;
      }

      // Command palette trigger: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onSearchToggle();
        return;
      }

      // If user is focused on an input, do not trigger single-letter shortcuts
      if (isInput) return;

      // Slash '/' triggers search too
      if (e.key === "/") {
        e.preventDefault();
        onSearchToggle();
        return;
      }

      // 'l' or 'L' toggles layer control panel
      if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        onLayersToggle();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchToggle, onLayersToggle, onCloseActivePanel]);
}
