"use client";

import { useRef, useState } from "react";
import { Flip, MOTION_OK, gsap, useGSAP } from "@/lib/gsap";
import { hexToRgb, rgbToCmyk } from "@/lib/color";
import { COLOR_PRESETS, colorScore } from "@/lib/filter";
import { POSTERS, Poster, posterById } from "./posters";

const FEATURED = posterById("riso");
const fmt = {
  hex: (h: string) => h.toUpperCase(),
  rgb: (h: string) => hexToRgb(h).join(" "),
  cmyk: (h: string) => rgbToCmyk(hexToRgb(h)).join(" "),
};

/** A poster gives up its colours as paint chips, which then switch HEX → RGB → CMYK as you scroll. */
export function PaletteScene() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const chips = gsap.utils.toArray<HTMLElement>("[data-chip]");
        const poster = root.current!.querySelector<HTMLElement>("[data-featured]")!;
        const fromPoster = (el: HTMLElement) => {
          const a = el.getBoundingClientRect();
          const b = poster.getBoundingClientRect();
          return { x: b.left + b.width * 0.5 - (a.left + a.width / 2), y: b.top + b.height * 0.4 - (a.top + a.height / 2) };
        };
        const values = (format: keyof typeof fmt, i: number) => fmt[format](FEATURED.palette[i].hex);

        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top top", end: "+=200%", scrub: 0.6, pin: true, invalidateOnRefresh: true },
        });
        tl.from(chips, {
          x: (_, el) => fromPoster(el).x,
          y: (_, el) => fromPoster(el).y,
          scale: 0.3,
          rotation: (i) => [-14, 8, -6][i] ?? 0,
          autoAlpha: 0,
          stagger: 0.12,
          duration: 0.6,
          ease: "power3.out",
        })
          .to({}, { duration: 0.3 });
        for (const format of ["rgb", "cmyk"] as const) {
          tl.to("[data-format]", { scrambleText: { text: format.toUpperCase(), chars: "upperCase", speed: 0.6 }, duration: 0.25 });
          chips.forEach((chip, i) => {
            tl.to(chip.querySelector("[data-value]"), { scrambleText: { text: values(format, i), chars: "0123456789", speed: 0.6 }, duration: 0.3 }, "<");
          });
          tl.to({}, { duration: 0.4 });
        }
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="grid min-h-dvh content-center items-center gap-8 px-4 py-16 sm:px-8 md:grid-cols-2 md:gap-10">
      <div className="order-2 space-y-6 md:order-1">
        <p className="label text-muted">02 · Palettes</p>
        <h2 className="text-[clamp(2rem,5.5vw,4.5rem)] leading-[0.95] font-bold tracking-[-0.03em]" style={{ fontStretch: "118%" }}>
          Every image arrives with its palette.
        </h2>
        <p className="max-w-md text-lg text-muted">Read straight from the pixels the moment you save. Click a chip to copy it as <span data-format className="label text-ink">HEX</span>.</p>
        <ul className="flex flex-wrap gap-3">
          {FEATURED.palette.map((s) => (
            <li key={s.hex} data-chip className="min-w-24 shadow-[0_14px_30px_-16px_rgb(0_0_0/0.5)]">
              <span className="block aspect-[4/3]" style={{ background: s.hex }} />
              <span data-value className="label block border-x border-b border-line bg-sheet px-2 py-1.5 whitespace-nowrap tabular-nums">
                {s.hex.toUpperCase()}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div data-featured className="order-1 mx-auto w-[min(380px,44vw)] rotate-2 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] md:order-2">
        <Poster spec={FEATURED} />
      </div>
    </section>
  );
}

const DEMO_COLOURS = COLOR_PRESETS.filter((c) => ["Red", "Orange", "Yellow", "Blue", "Navy", "Pink", "Purple", "Cream"].includes(c.name));

/** The real colour search, on the landing posters. Same scoring as the app. */
export function ColourDemo() {
  const grid = useRef<HTMLDivElement>(null);
  const [colour, setColour] = useState<string | null>(null);

  const scored = colour
    ? POSTERS.map((p) => ({ p, score: colorScore(p.palette, colour) })).sort((a, b) => b.score - a.score)
    : POSTERS.map((p) => ({ p, score: 1 }));
  const matches = scored.filter((x) => x.score > 0).length;

  const pick = (hex: string | null) => {
    const state = Flip.getState(grid.current!.querySelectorAll("[data-tile]"));
    setColour(hex);
    // Wait for React to re-order the tiles, then animate from where they were.
    requestAnimationFrame(() =>
      Flip.from(state, {
        duration: 0.7,
        ease: "expo.out",
        stagger: 0.02,
        absolute: false,
        onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.5 }),
      }),
    );
  };

  return (
    <section className="px-4 pt-8 pb-24 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <p className="label text-muted">03 · Search by colour</p>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] leading-none font-bold tracking-[-0.03em]" style={{ fontStretch: "118%" }}>
            “Everything with this orange.”
          </h2>
        </div>
        <div className="space-y-2">
          <p className="label text-muted">Try it · {colour ? `${matches} of ${POSTERS.length}` : `${POSTERS.length} posters`}</p>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Search the posters by colour">
            {DEMO_COLOURS.map((c) => (
              <button
                key={c.hex}
                aria-pressed={colour === c.hex}
                aria-label={c.name}
                title={c.name}
                onClick={() => pick(colour === c.hex ? null : c.hex)}
                className={`size-8 rounded-full border border-line transition-transform hover:scale-110 ${colour === c.hex ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                style={{ background: c.hex }}
              />
            ))}
            {colour && (
              <button onClick={() => pick(null)} className="label ml-1 text-muted hover:text-ink">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      <div ref={grid} className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {scored.map(({ p, score }) => (
          <div
            key={p.id}
            data-tile
            data-flip-id={p.id}
            className={`aspect-[4/5] overflow-hidden transition-opacity duration-500 ${score > 0 ? "" : "opacity-15 grayscale"}`}
          >
            <Poster spec={p} cover />
          </div>
        ))}
      </div>
    </section>
  );
}
