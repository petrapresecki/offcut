"use client";

import { useRef } from "react";
import { MOTION_OK, gsap, useGSAP } from "@/lib/gsap";
import { POSTERS, Poster } from "./posters";

/** A messy pile in the middle sorts itself into a grid as you scroll. */
export function PileScene() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const area = root.current!.querySelector<HTMLElement>("[data-area]")!;
        const cards = gsap.utils.toArray<HTMLElement>("[data-card]");
        const toCentre = (el: HTMLElement) => {
          const a = el.getBoundingClientRect();
          const b = area.getBoundingClientRect();
          return { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2) };
        };
        // Cards are laid out in their final grid; the pile is where they start.
        gsap.from(cards, {
          x: (_, el) => toCentre(el).x + gsap.utils.random(-60, 60),
          y: (_, el) => toCentre(el).y + gsap.utils.random(-40, 40),
          rotation: () => gsap.utils.random(-25, 25),
          scale: 0.9,
          ease: "power2.inOut",
          stagger: { each: 0.03, from: "end" },
          scrollTrigger: { trigger: root.current, start: "top top", end: "+=160%", scrub: 0.8, pin: true, invalidateOnRefresh: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="flex min-h-dvh flex-col justify-center gap-8 overflow-hidden px-4 py-16 sm:px-8">
      <div className="max-w-2xl space-y-3">
        <p className="label text-muted">04 · Library</p>
        <h2 className="text-[clamp(2rem,5vw,4rem)] leading-[0.95] font-bold tracking-[-0.03em]" style={{ fontStretch: "118%" }}>
          From a pile on the desk to a library you can search.
        </h2>
      </div>
      <div data-area className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
        {POSTERS.map((p) => (
          <div key={p.id} data-card className="aspect-[4/5] overflow-hidden shadow-[0_14px_30px_-18px_rgb(0_0_0/0.5)]">
            <Poster spec={p} cover />
          </div>
        ))}
      </div>
    </section>
  );
}
