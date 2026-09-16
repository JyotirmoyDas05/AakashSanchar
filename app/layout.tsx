import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// viewportFit: cover lets the layout paint under the notch/home indicator; the
// panels that sit against an edge pad themselves back with env(safe-area-inset-*).
// maximumScale is deliberately not set — pinch-zoom must stay available.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export const metadata: Metadata = {
  title: "AakashSanchar | SouthEast Asia Intel Dashboard",
  description:
    "Advanced OSINT situational awareness dashboard visualizing real-time SouthEast Asia hotspots and news feeds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-brand-bg text-brand-text-primary overscroll-none touch-manipulation">
        {children}
      </body>
    </html>
  );
}
