# AakashSanchar Design System

AakashSanchar is a premium, cinematic OSINT (Open Source Intelligence) dashboard that visualizes global news events using high-contrast geospatial layers.

## 1. Design Tokens & Rationale

### Color System (Deep Space / Cyber Cinematic)
Unlike the pitch-black and standard red/yellow traffic light palette of the reference app, AakashSanchar employs a rich deep-space navy/charcoal base with custom glowing cybernetic categories.

| Token | CSS Value / Tailwind | Description |
| :--- | :--- | :--- |
| **Base Canvas** | `#080C14` / `bg-[#080C14]` | Main app background, deep space navy |
| **Panel Surface** | `#0E1626` / `bg-[#0E1626]/85` | Semi-transparent card panels with backdrop blur |
| **Border Stroke** | `#1E2B44` / `border-[#1E2B44]` | Slate-blue frame divider |
| **Primary Text** | `#F8FAFC` / `text-slate-50` | Headers and vital readouts |
| **Secondary Text**| `#94A3B8` / `text-slate-400` | Log info, coordinates, sources |
| **Muted Text** | `#64748B` / `text-slate-500` | Grid scales, timestamps |

#### Active Category Glow Colors
*   **Breaking News:** Electric Fuchsia (`#F43F5E` / `bg-rose-500` / `shadow-[0_0_8px_rgba(244,63,94,0.4)]`)
*   **Protests:** Safety Orange (`#F97316` / `bg-orange-500` / `shadow-[0_0_8px_rgba(249,115,22,0.4)]`)
*   **Disasters:** Crimson Red (`#EF4444` / `bg-red-500` / `shadow-[0_0_8px_rgba(239,68,68,0.4)]`)
*   **Politics:** Royal Blue (`#3B82F6` / `bg-blue-500` / `shadow-[0_0_8px_rgba(59,130,246,0.4)]`)
*   **Economy:** Emerald Mint (`#10B981` / `bg-emerald-500` / `shadow-[0_0_8px_rgba(16,185,129,0.4)]`)
*   **Tech / Cyber:** Neon Cyan (`#06B6D4` / `bg-cyan-500` / `shadow-[0_0_8px_rgba(6,182,212,0.4)]`)

### Typography Pairing
*   **Sans-Serif Font (Headers & UI):** `Inter` or `Outfit` (loaded via Next.js Google Fonts) for clean, futuristic corporate look.
*   **Monospace Font (Metrics & Coordinates):** `JetBrains Mono` or `Space Mono` for strict tabular metrics, time coordinates, and latitude/longitude pairs.

### Spacing & Grid Density
*   **Density Multiplier:** 6px grid base. Layout padding values are set to:
    *   `1.5` (6px) - tight badges, minimal buttons
    *   `3` (12px) - secondary lists, card body paddings
    *   `4.5` (18px) - primary panel paddings, spacing between major groups
    *   `6` (24px) - dashboard outer margins
*   **Visual Structure:** Top borders of major modules have a 2px colored gradient line to emphasize containment and a futuristic command interface.

### Component Variants
*   **Tactical Card:** Transparent background with high-opacity glassmorphism. Subtle top border highlighting category/status.
*   **Interactive Button:** Outline variant with hover filling effect. Click effect includes scale down transition (95%).
*   **Glow Badge:** Pill format with low-opacity background tint and full-opacity text coupled with a corresponding neon indicator light dot.

### Motion & Transitions
*   **Transitions:** All UI drawer sliding and state expansion toggles use a custom easing:
    *   `transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)` (Sleek decelerated motion)
*   **Micro-Animations:** Tooltips and menu items scale-fade in from 98% opacity/scale to 100% on hover.

---

## 2. Rationale: How AakashSanchar Differs from World Monitor

1.  **Unique Layout Composition:** Rather than a floating-card layout on top of a full-screen map, AakashSanchar uses a structured grid app shell with a clear vertical control rail on the left, a top-level stats tick bar, and a dedicated, docking collapsible panels setup (right sidebar and bottom feed) that does not clip the map canvas unpredictably.
2.  **Color Identity:** Shifted from generic pure dark-black/traffic-lights to a military-intelligence inspired Deep Space Blue theme using cyber-cyan, neon-magenta, and safety-orange indicators, reducing eye strain and looking significantly more custom-designed.
3.  **Visualization Stack:** World Monitor uses full WebGL-based deck.gl / MapLibre. AakashSanchar is built with highly optimized React Leaflet, using customized dark tile servers (e.g., CartoDB Dark Matter) and custom canvas-based marker aggregation and heatmap logic to achieve responsive performance without loading heavy multi-megabyte 3D engine binaries.
4.  **UI Density & Usability:** AakashSanchar prioritizes tabular layouts and detailed logging streams, featuring interactive keyboard-driven command navigation suitable for desktop operators.
