import type { Metadata, Viewport } from "next";
import { Host_Grotesk, Reddit_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Running text, labels and colour values in Reddit Mono; titles and big sentences in Host Grotesk
// Light; Sprat (Collletttivo, OFL) only for the OFFCUT wordmark.
const host = Host_Grotesk({ variable: "--font-host", subsets: ["latin", "latin-ext"], weight: ["300", "400", "500"] });
const reddit = Reddit_Mono({ variable: "--font-reddit", subsets: ["latin", "latin-ext"], weight: ["400", "500"] });
// Sprat's own axes (wdth 100–200, wght 10–200) are set with font-variation-settings where it's used.
const sprat = localFont({ variable: "--font-sprat", src: "./fonts/SpratVF.woff2" });

export const metadata: Metadata = {
  title: { default: "Offcut", template: "%s · Offcut" },
  description: "A library for the images you couldn’t throw away. Save them, find them again by colour, send them as a moodboard.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f0ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${host.variable} ${reddit.variable} ${sprat.variable}`}>{children}</body>
    </html>
  );
}
