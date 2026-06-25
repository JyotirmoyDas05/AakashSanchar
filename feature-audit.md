# World Monitor Feature Audit

This document audits the core features of [World Monitor](https://worldmonitor.app) to understand its information architecture and capabilities, acting as reference research for our original implementation.

## 1. Landing Page Structure
*   **Hero Section:** High-impact, dark themed with an interactive WebGL globe or high-quality video showcase demonstrating global events tracking.
*   **Feature Grid:** Details categories of monitoring (conflict, finance, tech, infrastructure).
*   **Call to Actions (CTAs):** Primary button to "Launch App" (redirects to the web app dashboard) and secondary button to "Download Desktop App" (Tauri-based installer for Windows/macOS/Linux).
*   **Documentation Linkages:** Links to user guides, api documentation, and self-hosting configurations.

## 2. Dashboard / App Shell
*   **Header Bar:** Sticky top bar featuring the application logo, search palette trigger, connection status indicator (WebSocket/API state), settings toggle, and version tag.
*   **Sidebar Rail:** Compact, collapsible sidebar containing quick-access navigation tabs (Geopolitical, Tech, Finance, Commodities, Settings).
*   **Central Map Canvas:** Occupies 100% of the viewport height and width behind overlay panels. Responsive sizing with pointer events isolated to non-ui components.
*   **Overlay Panels:** Floating glassmorphism cards that sit on top of the map. They can be dragged, minimized, or snapped to the edges.

## 3. Panels & Drawers
*   **Insights Panel (Right side):** Floating drawer showing live AI briefs, geopolitical summaries, and detailed metrics of selected countries/events.
*   **Activity Feed (Left side/Bottom):** Live scrolling ticker of OSINT updates with quick-focus buttons.
*   **Modals:** Used for full-screen settings, command palettes, and custom API key input.

## 4. Layer Controls
*   **Category Toggles:** Quick-select layers to toggle markers/overlays for conflicts, natural disasters, shipping tracks, flight routes, and infrastructure cables.
*   **Opacity Sliders:** Controls basemap opacity and overlay intensity.
*   **Multi-Select Matrix:** Ability to overlay shipping data directly over conflict hotspots to visualize trade disruptions.

## 5. Filtering Patterns
*   **Category filters:** High-level thematic filtering.
*   **Time Range slider:** Dynamic selection ranges from 1 hour, 6 hours, 24 hours, to 7 days, or custom history queries.
*   **Region Search:** Text-based filtering that pans/zooms the map to the selected geographic area.

## 6. Marker, Popup, and Cluster Behavior
*   **Markers:** High-contrast SVGs with pulsed rings indicating severity.
*   **Hotspot Clusters:** WebGL-accelerated dense cluster grouping, showing heat rings rather than basic circular numbers when zoomed out.
*   **Tooltips (Hover):** Light, instantly-responsive tooltip showing location name and threat index.
*   **Popups (Click):** Detailed cards showing summaries, sources, intensity, and deep-link options.

## 7. URL State Syncing
*   **State Parameters:** Serializes map state directly to the URL string (e.g., `?lat=12.97&lng=77.59&zoom=8&layers=conflict,disaster&time=24h`).
*   **Directional Sync:** Changes to query parameters trigger map repositioning, and panning/zooming updates the query string seamlessly.

## 8. Mobile & Tablet Responsiveness
*   **Responsive Adaptation:** On mobile viewports, the side panels collapse into bottom-drawers, and the map takes precedence. Multi-column statistics panels collapse into a single swipeable carousel.
*   **Gestures:** Double-tap zoom, two-finger rotate, and drag drawers to expand.
