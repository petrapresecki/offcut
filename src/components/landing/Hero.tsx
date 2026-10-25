"use client";

import Link from "next/link";
import { useRef } from "react";
import { Draggable, EASE_OUT, MOTION_OK, gsap, useGSAP } from "@/lib/gsap";
import { Poster, posterById } from "./posters";

// Where the posters land, as % of the hero. They sit around the edges so the headline stays clear.
const SCATTER = [
  { id: "riso", left: 3, top: 12, rot: -8, w: 12 },
  { id: "tide", left: 84, top: 11, rot: 6, w: 12 },
  { id: "kern", left: 74, top: 72, rot: -4, w: 10 },
  { id: "flora", left: 6, top: 71, rot: 5, w: 11 },
  { id: "night", left: 90, top: 44, rot: 10, w: 8 },
  { id: "pack", left: 44, top: 83, rot: -3, w: 8 },
  { id: "mono", left: 60, top: 9, rot: 4, w: 7 },
];

export function Hero({ cta }: { cta: { href: string; label: string } }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const posters = gsap.utils.toArray<HTMLElement>("[data-poster]");
        const tl = gsap.timeline({ defaults: { ease: EASE_OUT } });
        tl.from("[data-line]", { yPercent: 110, duration: 1.2, stagger: 0.08 })
          .from("[data-mark]", { scale: 0, duration: 0.6, stagger: 0.05, ease: "power3.out" }, 0.7)
          .from(
            posters,
            {
              // Dropped from above like prints onto a desk, each with a little spin.
              y: () => -window.innerHeight * 1.1,
              rotation: () => gsap.utils.random(-40, 40),
              duration: 1.4,
              stagger: { each: 0.07, from: "random" },
              ease: "power4.out",
            },
            0.2,
          )
          .from("[data-fade]", { autoAlpha: 0, y: 12, duration: 0.8, stagger: 0.08 }, 0.9);

        let z = 10;
        Draggable.create(posters, {
          bounds: root.current,
          zIndexBoost: false,
          onPress() {
            z += 1;
            gsap.set(this.target, { zIndex: z });
            gsap.to(this.target, { scale: 1.05, rotation: "+=" + gsap.utils.random(-4, 4), duration: 0.3, ease: "power2.out" });
          },
          onRelease() {
            gsap.to(this.target, { scale: 1, duration: 0.5, ease: "back.out(2)" });
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative h-dvh min-h-[640px] overflow-hidden">
      {SCATTER.map((s, i) => (
        <div
          key={s.id}
          data-poster
          className={`absolute z-10 cursor-grab shadow-[0_18px_40px_-18px_rgb(0_0_0/0.45)] active:cursor-grabbing ${i > 3 ? "hidden lg:block" : ""}`}
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: `clamp(72px, ${s.w}vw, 220px)`, rotate: `${s.rot}deg` }}
        >
          <Poster spec={posterById(s.id)} />
        </div>
      ))}

      <div className="pointer-events-none relative z-0 flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="relative px-[0.4em] py-[0.25em] text-[clamp(2.5rem,8vw,8rem)]">
          <h1 className="leading-[0.86] font-extrabold tracking-[-0.045em]" style={{ fontStretch: "125%" }}>
            <span className="block overflow-hidden pb-[0.04em]">
              <span data-line className="block">Keep the good</span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-line className="inline-block bg-accent px-[0.06em] text-accent-ink">offcuts.</span>
            </span>
          </h1>
          {/* Crop marks around the headline, as if it's about to be trimmed. */}
          {(["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((pos) => (
            <span key={pos} aria-hidden data-mark className={`absolute size-5 ${pos}`}>
              <span className={`absolute h-px w-5 bg-ink ${pos.includes("top") ? "top-0" : "bottom-0"}`} />
              <span className={`absolute h-5 w-px bg-ink ${pos.includes("left") ? "left-0" : "right-0"}`} />
            </span>
          ))}
        </div>
        <p data-fade className="mt-6 max-w-md text-lg text-muted">
          A library for the posters, packaging, type and photos that inspire you. Save it, find it again by colour, close the tab.
        </p>
        <div data-fade className="pointer-events-auto mt-8 flex items-center gap-4">
          <Link href={cta.href} className="bg-ink px-5 py-3 font-medium text-paper transition-transform hover:-translate-y-0.5">
            {cta.label}
          </Link>
          <span className="label hidden text-muted sm:inline">↖ Drag the posters</span>
        </div>
      </div>
    </section>
  );
}
