"use client";

import Link from "next/link";
import { useEffect } from "react";
import Lenis from "lenis";
import { Wordmark } from "@/components/Wordmark";
import { ScrollTrigger, gsap } from "@/lib/gsap";
import { Hero } from "./Hero";
import { ColourDemo, PaletteScene } from "./PaletteScene";
import { PileScene } from "./PileScene";
import { TabsScene } from "./TabsScene";

const FEATURES = [
  { title: "Save from anywhere", body: "Drop images in, paste a screenshot with ⌘V, or choose files. Many at once.", soon: false },
  { title: "Palettes", body: "Every image’s colours, ready to copy as HEX, RGB or CMYK.", soon: false },
  { title: "Search by colour", body: "Pick a colour and see everything that has it, best matches first.", soon: false },
  { title: "Boards", body: "One per client, project or mood. Drop images straight onto a board.", soon: false },
  { title: "No doubles", body: "Saved it already? Offcut notices, even if it’s a smaller copy.", soon: false },
  { title: "Notes, tags, credit", body: "Why you saved it, who made it, and where it came from.", soon: false },
  { title: "Save from your phone", body: "Share a photo from your camera roll straight into Offcut.", soon: true },
  { title: "Moodboards & PDF", body: "Arrange a board freely, present it, export it for the client.", soon: true },
];

export function Landing({ signedIn }: { signedIn: boolean }) {
  const cta = signedIn ? { href: "/library", label: "Open your library" } : { href: "/login", label: "Start your library" };

  // Smooth scrolling, kept in step with ScrollTrigger. Skipped for reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // Fonts change line heights, which moves every pinned section.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-4 sm:px-8 [&>*]:pointer-events-auto">
        <Wordmark className="bg-paper/80 px-2 py-1 backdrop-blur" />
        <Link href={cta.href} className="label bg-paper/80 px-2 py-1 backdrop-blur hover:underline">
          {signedIn ? "Open library" : "Sign in"}
        </Link>
      </header>

      <main>
        <Hero cta={cta} />
        <TabsScene />
        <PaletteScene />
        <ColourDemo />
        <PileScene />

        <section className="px-4 py-24 sm:px-8">
          <p className="label mb-8 text-muted">05 · Everything else</p>
          <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="space-y-2 bg-paper p-6">
                <p className="flex items-center gap-2 font-semibold">
                  {f.title}
                  {f.soon && <span className="label bg-accent px-1.5 py-0.5 text-accent-ink">Soon</span>}
                </p>
                <p className="text-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <footer className="overflow-hidden px-4 pt-16 pb-6 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <p className="max-w-md text-2xl font-semibold tracking-tight" style={{ fontStretch: "112%" }}>
              Made for graphic designers who keep everything.
            </p>
            <Link href={cta.href} className="bg-ink px-5 py-3 font-medium text-paper transition-transform hover:-translate-y-0.5">
              {cta.label}
            </Link>
          </div>
          <p aria-hidden className="wordmark mt-12 text-[clamp(5rem,25vw,24rem)] leading-[0.75] select-none">
            offcut<span className="text-accent">.</span>
          </p>
        </footer>
      </main>
    </>
  );
}
