"use client";

import { useEffect } from "react";

interface ShortcutsProps {
  onSearchToggle: () => void;
  onLayersToggle: () => void;
  onCloseActivePanel: () => void;
  onWidgetToggle?: (widgetId: string) => void;
  onSettingsToggle?: () => void;
}

const WIDGET_KEY_MAP: Record<string, string> = {
  "1": "wire",
  "2": "stocks",
  "3": "streams",
  "4": "cameras",
  "5": "outbreaks",
};

export function useKeyboardShortcuts({
  onSearchToggle,
  onLayersToggle,
  onCloseActivePanel,
  onWidgetToggle,
  onSettingsToggle,
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

      // Alt + [1-7] for Widget shortcuts
      if (e.altKey && WIDGET_KEY_MAP[e.key] && onWidgetToggle) {
        e.preventDefault();
        onWidgetToggle(WIDGET_KEY_MAP[e.key]);
        return;
      }

      // Alt + S for Settings shortcut
      if (e.altKey && e.key.toLowerCase() === "s" && onSettingsToggle) {
        e.preventDefault();
        onSettingsToggle();
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
  }, [
    onSearchToggle,
    onLayersToggle,
    onCloseActivePanel,
    onWidgetToggle,
    onSettingsToggle,
  ]);
}
