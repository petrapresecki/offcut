"use client";

import { useRef } from "react";
import { MOTION_OK, gsap, useGSAP } from "@/lib/gsap";
import { Poster, posterById } from "./posters";

const TABS = [
  ["Behance", "Identity for a coffee roaster"], ["Pinterest", "risograph poster"], ["Are.na", "type specimens"],
  ["Instagram", "@studio.posters"], ["Savee", "packaging"], ["IMG_2041.jpg", ""], ["Google Images", "swiss poster 1960"],
  ["Behance", "Editorial design 2026"], ["Fonts In Use", "Grotesk on signage"], ["Pinterest", "label design"],
  ["Screenshot 14.32", ""], ["Dribbble", "logo marks"], ["Are.na", "textures"], ["Instagram", "@printshop"],
  ["Behance", "Festival identity"], ["Savee", "book covers"], ["Pinterest", "bauhaus colours"], ["IMG_2077.HEIC", ""],
  ["Google Images", "matchbox labels"], ["Behance", "Wine packaging"], ["Are.na", "grids"], ["Pinterest", "zine layout"],
] as const;

const COLOURS = ["#e8412b", "#2b59c3", "#f2c94c", "#2f6b4f", "#ff6fa5", "#7b4fb3", "#f28c28", "#141414"];
const START = 3723018;

export function TabsScene() {
  const root = useRef<HTMLElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tabs = gsap.utils.toArray<HTMLElement>("[data-tab]");
        const board = root.current!.querySelector<HTMLElement>("[data-board]")!;
        const counter = { n: START };

        // Each tab flies to the middle of the board, measured fresh on every refresh (resize).
        const delta = (el: HTMLElement) => {
          const a = el.getBoundingClientRect();
          const b = board.getBoundingClientRect();
          return { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2) };
        };

        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top top", end: "+=180%", scrub: 0.6, pin: true, invalidateOnRefresh: true },
        });
        tl.to(tabs, {
          x: (_, el) => delta(el).x,
          y: (_, el) => delta(el).y,
          scale: 0.2,
          rotation: () => gsap.utils.random(-30, 30),
          autoAlpha: 0,
          ease: "power2.in",
          stagger: { each: 0.04, from: "random" },
          duration: 0.5,
        })
          .to(
            counter,
            {
              n: 0,
              ease: "power3.in",
              duration: tl.duration(),
              onUpdate: () => {
                if (count.current) count.current.textContent = Math.round(counter.n).toLocaleString("en-GB");
              },
            },
            0,
          )
          .from("[data-cover]", { scale: 0, autoAlpha: 0, stagger: 0.12, duration: 0.3, ease: "back.out(1.6)" }, 0.3)
          .to(board, { scale: 1.06, duration: 0.1, yoyo: true, repeat: 1, ease: "power1.inOut" }, ">-0.05")
          .from("[data-done]", { autoAlpha: 0, y: 16, duration: 0.2 }, ">-0.1");
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative flex min-h-dvh flex-col justify-center gap-10 overflow-hidden px-4 py-16 sm:px-8">
      <div>
        <p className="label mb-4 text-muted">01 · Close your tabs</p>
        {/* One line at every width, so the count shrinking doesn't reflow the page mid-scroll. */}
        <h2 className="text-[clamp(1.4rem,5.2vw,4.5rem)] leading-[0.95] font-bold tracking-[-0.03em] whitespace-nowrap" style={{ fontStretch: "118%" }}>
          <span ref={count} className="tabular-nums">{START.toLocaleString("en-GB")}</span>
          <span className="text-muted"> tabs open.</span>
        </h2>
        <p data-done className="mt-4 max-w-md text-lg">Saved to a board, colours read, tabs closed. They’re all still there when you need them.</p>
      </div>

      <div className="relative overflow-hidden border border-line bg-sheet">
        {/* A browser window that has seen too much. */}
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1 p-2">
          {TABS.map(([site, title], i) => (
            <span key={i} data-tab className={`${i >= 10 ? "hidden sm:flex" : "flex"} max-w-[11rem] min-w-0 items-center gap-1.5 border border-line bg-paper px-2 py-1 text-xs`}>
              <span className="size-2.5 shrink-0" style={{ background: COLOURS[i % COLOURS.length] }} />
              <span className="truncate">
                {site}
                {title && <span className="text-muted"> – {title}</span>}
              </span>
            </span>
          ))}
        </div>
        <div className="grid place-items-center px-4 pt-6 pb-10">
          <div data-board className="w-[min(240px,60vw)] border border-ink bg-paper p-2 shadow-[0_24px_50px_-24px_rgb(0_0_0/0.5)]">
            <div className="grid aspect-square grid-cols-2 gap-1">
              {["riso", "tide", "flora", "kern"].map((id) => (
                <div key={id} data-cover className="overflow-hidden">
                  <Poster spec={posterById(id)} cover />
                </div>
              ))}
            </div>
            <p className="mt-2 font-medium">Inspo, week 43</p>
            <p className="label text-muted">22 images</p>
          </div>
        </div>
      </div>
    </section>
  );
}
