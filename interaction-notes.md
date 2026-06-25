# World Monitor Interaction Design Notes

This document describes the interaction mechanics and state-handling paradigms of the World Monitor application.

## 1. Map Navigation & Viewport Interactions
*   **Hover Tooltips:** Hovering over an event marker instantly displays a tiny, high-contrast tooltip containing the title and coordinate tags. Delay is minimal (< 50ms) to ensure responsiveness.
*   **Click Focus:** Clicking a marker centers the map on its location with a smooth flyTo transition and opens the detailed information panel.
*   **Hotspot Hover:** Hovering over high-density hotspots displays a regional summary (e.g., "7 events in Delhi NCR").

## 2. URL State & Shareability
*   **Bidirectional Sync:** The application state is fully serialized in the URL query string.
*   **Query Parameter Names:**
    *   `z`: Zoom level.
    *   `c`: Latitude,longitude coordinates (e.g. `28.6139,77.209`).
    *   `layers`: Comma-separated active layer identifiers.
    *   `range`: Current time range filter.
*   **History Control:** Viewport panning uses `window.history.replaceState` to avoid polluting the history stack, while clicking specific events uses `window.history.pushState` to allow back-button navigation.

## 3. Keyboard Shortcuts & Command Palette
*   **Search Trigger:** Pressing `CMD+K` or `/` opens a floating command/search palette modal.
*   **Focus Control:** The command palette allows users to search events by name, location, or source, and immediately pan to them.
*   **Toggle Shortcuts:** Key bindings like `L` toggle the layer sidebar panel; `Esc` closes active details drawers.

## 4. UI Loading & Skeleton States
*   **Layout Stability:** Skeletons have matching aspect ratios and dimensions to prevent layout shifts when data resolves.
*   **Micro-Animations:** Skeleton blocks pulse slowly with a subtle opacity cycle (`0.3` to `0.6` at 1.5s intervals) instead of high-contrast moving shine gradients, which can be visually distracting on dark maps.
