"use client";

import { useRef, useState } from "react";
import { Flip } from "@/lib/gsap";
import { hexToRgb } from "@/lib/color";
import { COLOR_PRESETS, colorScore } from "@/lib/filter";
import { POSTERS, Poster } from "./posters";

const COLOURS = COLOR_PRESETS.filter((c) => ["Red", "Orange", "Yellow", "Pink", "Purple", "Blue", "Navy", "Cream"].includes(c.name));

/**
 * The real colour search, on the drawn posters, laid out like a type specimen: every poster
 * with its name and its own colour values underneath. Same scoring as the app.
 */
export function ColourSearch() {
  const grid = useRef<HTMLDivElement>(null);
  const [colour, setColour] = useState<string | null>(null);

  const scored = colour
    ? POSTERS.map((p) => ({ p, score: colorScore(p.palette, colour) })).sort((a, b) => b.score - a.score)
    : POSTERS.map((p) => ({ p, score: 1 }));
  const matches = scored.filter((x) => x.score > 0).length;

  const pick = (hex: string | null) => {
    const state = Flip.getState(grid.current!.querySelectorAll("[data-tile]"));
    setColour(hex);
    requestAnimationFrame(() => Flip.from(state, { duration: 0.6, ease: "power3.inOut", absolute: false }));
  };

  return (
    <section className="px-4 pt-24 pb-16 sm:px-5" aria-labelledby="colour-title">
      <div className="mb-6 grid gap-4 md:grid-cols-12">
        <h2 id="colour-title" className="title md:col-span-5">
          Everything with this orange
        </h2>
        <div className="flex flex-wrap items-center gap-2 md:col-span-7 md:justify-end" role="group" aria-label="Search the posters by colour">
          <span className="label mr-2 text-muted">{colour ? `${matches} of ${POSTERS.length}` : "Pick a colour"}</span>
          {COLOURS.map((c) => (
            <button
              key={c.hex}
              aria-pressed={colour === c.hex}
              aria-label={c.name}
              title={c.name}
              onClick={() => pick(colour === c.hex ? null : c.hex)}
              className={`h-8 w-12 rounded-kit transition-transform hover:-translate-y-0.5 ${colour === c.hex ? "outline-2 outline-offset-2 outline-ink" : ""}`}
              style={{ background: c.hex, outlineStyle: colour === c.hex ? "solid" : undefined }}
            />
          ))}
          {colour && (
            <button onClick={() => pick(null)} className="link label ml-1">
              Clear
            </button>
          )}
        </div>
      </div>
      <div ref={grid} className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        {scored.map(({ p, score }) => (
          <figure key={p.id} data-tile data-flip-id={p.id} className={`m-0 transition-opacity duration-500 ${score > 0 ? "" : "opacity-20"}`}>
            <div className="aspect-[4/5] overflow-hidden rounded-kit">
              <Poster spec={p} cover />
            </div>
            <figcaption className="mt-2 flex items-baseline justify-between gap-2 text-[13px]">
              <span>{p.word}</span>
              <span className="flex gap-1" aria-label={`Colours ${p.palette.map((s) => s.hex).join(", ")}`}>
                {p.palette.map((s, i) => (
                  <span key={i} title={`${s.hex.toUpperCase()} · ${hexToRgb(s.hex).join(" ")}`} className="inline-block size-2.5 rounded-full" style={{ background: s.hex, boxShadow: "inset 0 0 0 1px var(--line)" }} />
                ))}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
