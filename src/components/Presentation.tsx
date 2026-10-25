"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { CanvasItem } from "@/lib/boards";
import { ARTBOARD_WIDTH, artboardHeight, type FormatId } from "@/lib/canvas";

export type Slide = { kind: "board" } | { kind: "image"; item: CanvasItem };

type Props = {
  name: string;
  items: CanvasItem[];
  format: FormatId;
  bg: string;
  start?: number;
  onExit: () => void;
  /** Extra controls under an image slide, e.g. the client's vote buttons. */
  renderActions?: (item: CanvasItem) => React.ReactNode;
};

/** The slides for a board: its moodboard first (when it has one), then every image. */
export function slidesFor(items: CanvasItem[]): Slide[] {
  const hasBoard = items.some((i) => i.placement);
  return [...(hasBoard ? [{ kind: "board" } as const] : []), ...items.map((item) => ({ kind: "image", item }) as const)];
}

export function Presentation({ name, items, format, bg, start = 0, onExit, renderActions }: Props) {
  const slides = slidesFor(items);
  const [index, setIndex] = useState(Math.min(start, slides.length - 1));
  const [direction, setDirection] = useState(1);
  const [chrome, setChrome] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = useCallback(
    (delta: number) => {
      setDirection(delta);
      setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + delta)));
    },
    [slides.length],
  );

  // Controls fade out while presenting and come back when the mouse moves.
  const wake = useCallback(() => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 2500);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else root.current?.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    wake();
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex(slides.length - 1);
      else if (e.key === "f") toggleFullscreen();
      else if (e.key === "Escape" && !document.fullscreenElement) onExit();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(hideTimer.current);
    };
  }, [go, onExit, slides.length, wake, toggleFullscreen]);

  // Swipe on touch screens.
  const touch = useRef<number | null>(null);

  const slide = slides[index];
  if (!slide) return null;
  const item = slide.kind === "image" ? slide.item : null;

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal
      aria-label={`${name}, presentation`}
      className="fixed inset-0 z-[100] grid grid-rows-[auto_1fr_auto] bg-[#0e0d0c] text-[#eeeae1]"
      onMouseMove={wake}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <header className={`flex items-center justify-between gap-4 px-5 py-4 transition-opacity duration-500 ${chrome ? "opacity-100" : "opacity-0"}`}>
        <p className="label truncate">
          {name} <span className="opacity-50">· {index + 1} / {slides.length}</span>
        </p>
        <div className="label flex items-center gap-4">
          <button onClick={toggleFullscreen} className="opacity-70 hover:opacity-100">Full screen (F)</button>
          <button onClick={onExit} className="opacity-70 hover:opacity-100">Close (Esc)</button>
        </div>
      </header>

      <div className="relative min-h-0 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 60 }),
              centre: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d * -60 }),
            }}
            initial="enter"
            animate="centre"
            exit="exit"
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
            className="absolute inset-0 grid place-items-center px-4 sm:px-16"
          >
            {slide.kind === "board" ? <BoardSlide items={items} format={format} bg={bg} /> : (
              // eslint-disable-next-line @next/next/no-img-element -- served from R2
              <img src={slide.item.imageUrl} alt={slide.item.title ?? ""} className="max-h-full max-w-full object-contain" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Big invisible click targets for previous / next. */}
        <button aria-label="Previous" disabled={index === 0} onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize disabled:cursor-default" />
        <button aria-label="Next" disabled={index === slides.length - 1} onClick={() => go(1)} className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize disabled:cursor-default" />
      </div>

      <footer className="flex min-h-16 flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className={`min-w-0 transition-opacity duration-500 ${chrome || renderActions ? "opacity-100" : "opacity-0"}`}>
          {item ? (
            <>
              <p className="truncate font-medium">{item.title ?? "Untitled"}</p>
              {item.credit && <p className="label opacity-60">{item.credit}</p>}
            </>
          ) : (
            <p className="font-medium">Moodboard</p>
          )}
        </div>
        {item && renderActions?.(item)}
      </footer>
    </div>
  );
}

/** The moodboard as one slide, scaled to fit. */
function BoardSlide({ items, format, bg }: { items: CanvasItem[]; format: FormatId; bg: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const height = artboardHeight(format);
  useEffect(() => {
    const el = box.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min((e.contentRect.width - 32) / ARTBOARD_WIDTH, (e.contentRect.height - 32) / height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);
  const placed = items.filter((i) => i.placement).sort((a, b) => a.placement!.z - b.placement!.z);
  return (
    <div ref={box} className="relative overflow-hidden" style={{ width: ARTBOARD_WIDTH * scale, height: height * scale, background: bg }}>
      {placed.map((i) => {
        const p = i.placement!;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- served from R2
          <img
            key={i.id}
            src={p.w * scale > 600 ? i.imageUrl : i.thumbUrl}
            alt={i.title ?? ""}
            className="absolute object-cover"
            style={{ left: p.x * scale, top: p.y * scale, width: p.w * scale, height: p.h * scale, zIndex: p.z }}
          />
        );
      })}
    </div>
  );
}
