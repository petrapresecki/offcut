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
};

export function ItemCard({ item, href, selecting, selected, onToggle }: CardProps) {
  const image = (
    <>
      <div className="relative overflow-hidden" style={{ aspectRatio: `${item.width} / ${item.height}`, background: item.palette[0]?.hex }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served from R2; next/image can't optimise on Workers */}
        <img
          src={item.thumbUrl}
          alt={item.title ?? ""}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition duration-700 ease-out-expo group-hover:scale-[1.02] ${selected ? "scale-[0.94]" : ""}`}
        />
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
      <div className="mt-2 flex h-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {item.palette.map((s) => (
          <span key={s.hex} style={{ background: s.hex, flexGrow: Math.max(s.weight, 0.05) }} />
        ))}
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
          className="crop-marks group block w-full text-left"
        >
          {image}
        </button>
      ) : (
        <Link href={href} className="crop-marks group block" aria-label={item.title ?? "Open image"}>
          {image}
        </Link>
      )}
    </motion.div>
  );
}
