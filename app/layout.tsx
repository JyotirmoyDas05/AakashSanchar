import type { Metadata } from "next";
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
      <body className="min-h-dvh flex flex-col bg-brand-bg text-brand-text-primary">
        {children}
      </body>
    </html>
  );
}
