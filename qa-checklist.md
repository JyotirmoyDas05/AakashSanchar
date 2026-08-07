# AakashSanchar QA Checklist

Use this checklist to verify the interactive features, design specs, and performance targets of the AakashSanchar application.

## 1. App Shell & Layout
- [ ] Sticky top navigation bar renders the AakashSanchar brand name and sovereign status badge.
- [ ] Left control rail fits perfectly inside the viewport grid and remains fixed.
- [ ] Right insights panel displays dynamic statistics (distribution progress bars, top hotspots, recent logs).
- [ ] Details panel opens as a smooth slide-in overlay from the right, docking correctly without clipping the map canvas.

## 2. Interactive Map (Leaflet)
- [ ] Map renders CartoDB Dark Matter tiles cleanly with zero load glitches.
- [ ] Dynamic marker dots render in high contrast according to their specific category colors:
  - Breaking (Fuchsia)
  - Protests (Orange)
  - Disasters (Red)
  - Politics (Blue)
  - Economy (Mint)
  - Tech (Cyan)
- [ ] Hover tooltips appear instantly with location names and source labels.
- [ ] Selecting an event node flys/moves the viewport smoothly to focus on it.
- [ ] Toggle visual modes between **Incident Nodes** and **Hotspot Heatmaps** works.

## 3. Layer System & Filters
- [ ] Layer control list displays the correct amount of active counts per category.
- [ ] Toggling individual categories shows/hides corresponding event markers on the map and feed.
- [ ] Time segment filters (1h, 6h, 24h, 7d, all) update the active event selection correctly.

## 4. URL State Sync
- [ ] Viewport coordinates (`lat`, `lng`) and `zoom` serialize to URL search parameters during dragging and zooming.
- [ ] Active `layers` and current `time` range serialize to URL parameters.
- [ ] Loading the page with URL parameters restores the map coordinates and filters.

## 5. Keyboard Navigation & Commands
- [ ] Pressing `Ctrl+K` or `/` opens the floating command palette.
- [ ] Command palette filters events by title, description, locationName, and source in real time.
- [ ] Navigation keys (Up/Down/Enter) allow selection of search results.
- [ ] Pressing `Esc` closes the command palette and active details panels.
- [ ] Single-character hotkeys (like `L`) are ignored when the user is typing inside search inputs.

## 6. Responsiveness
- [ ] Desktop viewport fits a grid layout.
- [ ] Mobile viewports: Side rail and insights panels collapse, and toggle controls are available.
