/**
 * Carto basemap URL helper — securely appends the API key from env.
 *
 * Per https://carto.com/basemaps/apikey/ raster basemaps now require
 * ?key=YOUR_KEY to suppress the watermark. The key is intentionally
 * exposed to the browser (tile URLs are fetched client-side), so it must
 * use the NEXT_PUBLIC_ prefix. Restrict the key to your domain in the
 * Carto dashboard for abuse protection.
 *
 * Env: NEXT_PUBLIC_CARTO_API_KEY
 *
 * Do NOT hardcode the key in source. Set it via:
 *  - local dev:   .env.local  (gitignored)
 *  - Vercel/host: dashboard env vars
 */

const CARTO_BASE = "https://{s}.basemaps.cartocdn.com";

export type BasemapTheme = "dark" | "light";

function getApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  return key || undefined;
}

/**
 * Returns the full TileLayer URL for the given theme, with ?key= appended
 * when NEXT_PUBLIC_CARTO_API_KEY is set. Falls back to anonymous URL (will
 * show watermark) if the key is missing, so the map still renders in
 * development before the key is configured.
 */
export function getCartoTileUrl(theme: BasemapTheme): string {
  const style = theme === "light" ? "light_all" : "dark_all";
  const base = `${CARTO_BASE}/${style}/{z}/{x}/{y}{r}.png`;
  const key = getApiKey();
  return key ? `${base}?key=${encodeURIComponent(key)}` : base;
}

/**
 * Optional helper to warn once in dev if the key is missing.
 */
let warned = false;
export function warnIfMissingKey(): void {
  if (warned) return;
  if (!getApiKey() && process.env.NODE_ENV !== "production") {
    warned = true;
    console.warn(
      "[basemaps] NEXT_PUBLIC_CARTO_API_KEY is not set — Carto tiles will show a watermark. " +
        "Add it to .env.local (see .env.example) and restart the dev server.",
    );
  }
}
