"use client";

import Link from "next/link";
import { Children, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { CardItem } from "@/lib/items";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Shortest-column masonry, so the newest images sit along the top row instead of down the
 * first column. Children can pass `data-ratio` (height / width) to be placed accurately.
 */
export function Masonry({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(4);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setCount(w < 520 ? 2 : w < 900 ? 3 : w < 1300 ? 4 : w < 1700 ? 5 : 6);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns: React.ReactNode[][] = Array.from({ length: count }, () => []);
  const heights = new Array(count).fill(0);
  Children.forEach(children, (child) => {
    if (!child) return;
    const ratio = Number((child as React.ReactElement<{ "data-ratio"?: number }>).props["data-ratio"] ?? 1);
    const col = heights.indexOf(Math.min(...heights));
    columns[col].push(child);
    heights[col] += ratio + 0.15;
  });

  return (
    <div ref={ref} className="flex items-start gap-3 sm:gap-4">
      {columns.map((col, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
          {col}
        </div>
      ))}
    </div>
  );
}

type CardProps = {
  item: CardItem;
  href: string;
  "data-ratio"?: number;
  selecting?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  badge?: { up: number; down: number; notes: number };
};

export function ItemCard({ item, href, selecting, selected, onToggle, badge }: CardProps) {
  const image = (
    <>
      <div className="relative overflow-hidden rounded-kit" style={{ aspectRatio: `${item.width} / ${item.height}`, background: item.palette[0]?.hex }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served from R2; next/image can't optimise on Workers */}
        <img
          src={item.thumbUrl}
          alt={item.title ?? ""}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition duration-500 ease-out-expo ${selected ? "scale-[0.94] rounded-kit" : ""}`}
        />
        {badge && (
          <span className="label absolute right-2 bottom-2 flex gap-2 bg-ink/85 px-2 py-1 text-paper" aria-label={`${badge.up} yes, ${badge.down} no, ${badge.notes} notes`}>
            {badge.up > 0 && <span>👍 {badge.up}</span>}
            {badge.down > 0 && <span>👎 {badge.down}</span>}
            {badge.notes > 0 && <span>✎ {badge.notes}</span>}
          </span>
        )}
        {selecting && (
          <span
            aria-hidden
            className={`absolute top-2 left-2 grid size-6 place-items-center border-2 text-xs font-bold transition-colors ${
              selected ? "border-accent bg-accent text-accent-ink" : "border-white/90 bg-black/20"
            }`}
          >
            {selected && "✓"}
          </span>
        )}
      </div>
      {/* Captioned like an archive: what it is, then who made it. */}
      <div className="mt-2 flex items-baseline justify-between gap-3 text-[12px] leading-tight">
        <span className="min-w-0 truncate">
          {item.title ?? <span className="text-muted">Untitled</span>}
          {item.credit && <span className="text-muted"> · {item.credit}</span>}
        </span>
        <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
          {item.palette.slice(0, 4).map((s, i) => (
            <span key={i} className="size-2 rounded-full" style={{ background: s.hex, boxShadow: "inset 0 0 0 1px var(--line)" }} />
          ))}
        </span>
      </div>
    </>
  );

  return (
    <motion.div layout="position" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE, duration: 0.6 }}>
      {selecting ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={`Select ${item.title ?? "image"}`}
          data-active={selected}
          className="group block w-full text-left"
        >
          {image}
        </button>
      ) : (
        <Link href={href} className="group block" aria-label={item.title ?? "Open image"}>
          {image}
        </Link>
      )}
    </motion.div>
  );
}
