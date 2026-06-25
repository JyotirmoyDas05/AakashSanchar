# Aegis Sentinel Implementation Plan

This document outlines the step-by-step implementation plan for Aegis Sentinel, following modular and typed Next.js standards.

## Phase 1: Core Type Definitions & Data Pipeline
1.  **Refactor `types/news.ts`**:
    *   Update `NewsCategory`: `"breaking" | "protests" | "disasters" | "politics" | "economy" | "tech"`
    *   Update `TimeRange`: `"1h" | "6h" | "24h" | "7d"`
    *   Update `NewsEvent` properties to support descriptions, sources, threat severity, and coordinates.
2.  **Refactor `data/mockNewsEvents.ts`**:
    *   Provide high-fidelity sample events spanning Indian metros and international cities, mapped to our new categories and exact time cutoffs (1h, 6h, 24h, 7d).
3.  **Update `lib/filterEvents.ts`**:
    *   Refactor event filtering logic to work with the updated categories and time ranges.

## Phase 2: Shell Layout, Global Styles & Custom Theme
1.  **Configure CSS (`app/globals.css`)**:
    *   Set up custom font variables (Outfit and JetBrains Mono).
    *   Add custom custom utility classes (neon box-shadow glow, dark scrollbars, backdrop-blur presets).
2.  **Build layout shell components (`components/AppShell.tsx` and related)**:
    *   *Sticky Top Bar*: Title, logo, status dots, quick time-range selectors.
    *   *Left Control Rail*: Icons to select categories, toggle layers, show active counts.
    *   *Right Insights Panel*: Statistical aggregates (hotspot lists, category charts).
    *   *Bottom Live Logs Feed*: Collapsible ticker showing streaming headlines.

## Phase 3: Interactive Leaflet Map Configuration
1.  **Update `components/MapClient.tsx`**:
    *   Configure CartoDB Dark Matter basemap (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
    *   Create custom `L.divIcon` markers with category-colored SVG glowing dots that change radius based on intensity.
    *   Include tooltips (hover text) and click selection logic (centers map and slides open panel).
    *   Implement Leaflet heat layer or aggregation visualization.

## Phase 4: URL Sync & Keyboard-Driven Shortcuts
1.  **Create URL Sync Hook (`hooks/useUrlState.ts`)**:
    *   Sync `lat`, `lng`, `zoom`, `timeRange`, and active `layers` as query parameters.
2.  **Create Keyboard Shortcuts Hook (`hooks/useKeyboardShortcuts.ts`)**:
    *   Listen for `Ctrl+K` (command palette), `L` (layer sidebar toggle), `Esc` (close panels), `S` (focus search).
3.  **Build Command Palette (`components/CommandPalette.tsx`)**:
    *   Keyboard navigability (Up/Down/Enter), instant fuzzy search, and jump-to-coordinates map control.

## Phase 5: Polishing, Responsiveness & QA
1.  **Polish Component Details**:
    *   Add loading skeletons (layout-stable, pulsating placeholders).
    *   Configure empty & error states.
2.  **Responsive Layout adjustments**:
    *   Mobile viewport: Collapse panels into sliding bottom-sheets.
    *   Tablet viewport: Stack panels horizontally.
