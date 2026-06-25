# World Monitor Technical Architecture Notes

This document analyzes the engineering decisions, database structures, client-side state caching, and libraries that power World Monitor.

## 1. Mapping Stack & WebGL
*   **Vector Rendering:** Uses MapLibre GL for rendering high-fidelity, vector-tile maps.
*   **Layer Composition:** Employs deck.gl layers (such as `ScatterplotLayer`, `HeatmapLayer`, and `LineLayer` for aviation tracks) to overlay thousands of moving points efficiently without visual lag.
*   **3D Viewport:** Embeds `globe.gl` (built on Three.js) for full orbital 3D views.

## 2. State & Caching Hierarchy
*   **L1 Cache (In-Memory):** Vanilla JavaScript `Map` collections that index events by ID and geo-hash. Extremely fast reads and updates during viewport changes.
*   **L2 Cache (Session Storage):** Session data store to retain active user panels and preferences without database trips.
*   **Offline/Service Workers:** Integrated Workbox-based service workers cache static tiles and static JSON event archives.

## 3. Data Transfer Format
*   **Protobuf Serialization:** Uses Protocol Buffers (gRPC / Twirp-style HTTP endpoints) instead of verbose JSON. This reduces payload sizes by up to 70% and enables strict structural guarantees.

## 4. Performance & Execution
*   **Vanilla DOM Architecture:** Avoids virtual DOM overhead (React/Vue) by rendering overlay panels using custom template functions and micro-libraries. This ensures immediate paint times and small JS assets (~250KB).
*   **Web Workers:** Offloads parsing of massive GDELT feed streams and RSS payloads to a background worker, preventing main-thread blocking.
