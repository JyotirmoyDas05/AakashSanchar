# World Monitor UI Design Patterns

This document captures the visual style, typography, color palette, and layout principles used by World Monitor.

## 1. Typography & Hierarchy
*   **Primary Typeface:** Clean, geometric sans-serif (e.g., Inter, Geist Sans) for headings and UI controls.
*   **Data Typeface:** Monospace (e.g., Geist Mono, JetBrains Mono) for coordinate data, threat metrics, timestamps, and log tickers.
*   **Scale:** High contrast sizing from 10px (for small status indicators) up to 24px (for large header statistics).

## 2. Color Palette & Theming
*   **Dominant Theme:** Monochromatic dark mode.
*   **Backgrounds:** #030303 (pure dark base) and #0D0D0E (card offsets).
*   **Accents / Severity Colors:**
    *   *High Threat / Breaking:* Neon Red (`#FF3B30` or similar high-chroma red).
    *   *Medium Threat / Warning:* Neon Amber/Yellow (`#FFCC00`).
    *   *Normal / Online:* Neon Green (`#34C759`).
    *   *System / Info:* Cyan / Ice Blue (`#00C7FC`).
*   **Borders:** Semi-transparent grays (`rgba(255, 255, 255, 0.08)` or `#1F1F22`) creating sub-pixel outlines.

## 3. Card & Panel Styling
*   **Glassmorphism:** Heavy use of `backdrop-filter: blur(12px)` with semi-transparent backgrounds to overlay map content without completely hiding it.
*   **Radii:** Sharp to moderate roundness (`4px` to `8px`). Avoids highly rounded bubbles to maintain a serious, military-grade / tactical interface.
*   **Shadows:** Low-opacity diffuse shadows combined with high-contrast border strokes.

## 4. Spacing System
*   **Grid Density:** 4px grid system. Gap sizes are predominantly `gap-2` (8px) and `gap-4` (16px) to pack maximum information density onto a single viewport screen.
*   **Layout Adaptability:** Layout elements snap to grid boundaries to fit full viewport grids perfectly.
