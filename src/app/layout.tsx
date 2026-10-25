import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// All three typefaces are by Collletttivo, an open-source type foundry (SIL Open Font License).
const ronzino = localFont({
  variable: "--font-ronzino",
  src: [
    { path: "./fonts/Ronzino-Regular.woff2", weight: "400" },
    { path: "./fonts/Ronzino-Medium.woff2", weight: "500" },
  ],
});
// Sprat's own axes (wdth 100–200, wght 10–200) are set with font-variation-settings where it's used.
const sprat = localFont({ variable: "--font-sprat", src: "./fonts/SpratVF.woff2" });
const necto = localFont({ variable: "--font-necto", src: "./fonts/NectoMono-Regular.woff2", weight: "400" });

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
      <body className={`${ronzino.variable} ${sprat.variable} ${necto.variable}`}>{children}</body>
    </html>
  );
}
