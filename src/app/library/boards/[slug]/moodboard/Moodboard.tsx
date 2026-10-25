"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { CanvasItem } from "@/lib/boards";
import { ARTBOARD_WIDTH, BACKGROUNDS, FORMATS, arrange, artboardHeight, type FormatId, type Placement } from "@/lib/canvas";
import { saveCanvas, setCanvasSettings } from "../../../actions";
import type { BoardRef } from "../../../Library";

type Item = CanvasItem;
type Drag =
  | { kind: "move"; id: string; startX: number; startY: number; origin: { x: number; y: number } }
  | { kind: "resize"; id: string; startX: number; origin: { w: number; h: number } };

const DEFAULT_WIDTH = 420; // artboard units for a newly placed image

export function Moodboard({
  board,
  initialItems,
  initialFormat,
  initialBg,
}: {
  board: BoardRef;
  initialItems: Item[];
  initialFormat: FormatId;
  initialBg: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [format, setFormat] = useState<FormatId>(initialFormat);
  const [bg, setBg] = useState(initialBg);
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(0.5);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [exporting, setExporting] = useState<string | null>(null);
  const [dpr, setDpr] = useState(1);
  const stage = useRef<HTMLDivElement>(null);
  const artboard = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const height = artboardHeight(format);
  const placed = useMemo(() => items.filter((i) => i.placement).sort((a, b) => a.placement!.z - b.placement!.z), [items]);
  const tray = items.filter((i) => !i.placement);
  const topZ = Math.max(0, ...placed.map((i) => i.placement!.z));

  useEffect(() => setDpr(window.devicePixelRatio || 1), []);

  // Fit the artboard to the stage.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const pad = 48;
      setScale(Math.min((e.contentRect.width - pad * 2) / ARTBOARD_WIDTH, (e.contentRect.height - pad * 2) / height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  // Saves the whole layout a moment after the last change.
  const queueSave = useCallback(
    (next: Item[]) => {
      setStatus("unsaved");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setStatus("saving");
        const placements: Placement[] = next.flatMap((i) => (i.placement ? [{ itemId: i.id, ...i.placement }] : []));
        const unplaced = next.filter((i) => !i.placement).map((i) => i.id);
        const res = await saveCanvas(board.id, placements, unplaced).catch(() => ({ error: "offline" }));
        setStatus("error" in res ? "error" : "saved");
      }, 600);
    },
    [board.id],
  );

  // Warn before leaving with a save still pending.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (status === "unsaved" || status === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [status]);

  const update = useCallback(
    (fn: (list: Item[]) => Item[], save = true) =>
      setItems((list) => {
        const next = fn(list);
        if (save) queueSave(next);
        return next;
      }),
    [queueSave],
  );

  const setPlacement = (id: string, placement: Item["placement"], save = true) =>
    update((list) => list.map((i) => (i.id === id ? { ...i, placement } : i)), save);

  const place = (item: Item, centre?: { x: number; y: number }) => {
    const w = Math.min(DEFAULT_WIDTH, (height * 0.6 * item.width) / item.height);
    const h = (w * item.height) / item.width;
    // Without a drop point, cascade new images from the top left so they don't stack exactly.
    const offset = (placed.length % 8) * 40;
    const x = centre ? centre.x - w / 2 : 80 + offset;
    const y = centre ? centre.y - h / 2 : 80 + offset;
    setPlacement(item.id, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z: topZ + 1 });
    setSelected(item.id);
  };

  const arrangeAll = (includeTray: boolean) => {
    const pool = includeTray ? items : placed;
    const layout = arrange(pool, { w: ARTBOARD_WIDTH, h: height });
    const byId = new Map(layout.map((p) => [p.itemId, p]));
    update((list) =>
      list.map((i) => {
        const p = byId.get(i.id);
        return p ? { ...i, placement: { x: p.x, y: p.y, w: p.w, h: p.h, z: p.z } } : i;
      }),
    );
  };

  const toPoint = (clientX: number, clientY: number) => {
    const rect = artboard.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const item = items.find((i) => i.id === d.id);
    if (!item?.placement) return;
    if (d.kind === "move") {
      const dy = (e.clientY - d.startY) / scale;
      setPlacement(d.id, { ...item.placement, x: Math.round(d.origin.x + dx), y: Math.round(d.origin.y + dy) }, false);
    } else {
      // Corner handle: resize from the top-left corner, keeping the image's proportions.
      const w = Math.max(40, d.origin.w + dx);
      setPlacement(d.id, { ...item.placement, w: Math.round(w), h: Math.round((w * item.height) / item.width) }, false);
    }
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    queueSave(items);
  };

  // Keyboard: nudge, layer order, remove from the artboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected || (e.target as HTMLElement).closest("input, select, textarea")) return;
      const item = items.find((i) => i.id === selected);
      if (!item?.placement) return;
      const p = item.placement;
      const step = e.shiftKey ? 20 : 2;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        setPlacement(item.id, { ...p, x: p.x + moves[e.key][0], y: p.y + moves[e.key][1] });
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setPlacement(item.id, null);
        setSelected(null);
      } else if (e.key === "]") setPlacement(item.id, { ...p, z: topZ + 1 });
      else if (e.key === "[") setPlacement(item.id, { ...p, z: Math.min(...placed.map((i) => i.placement!.z)) - 1 });
      else if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const changeFormat = (next: FormatId) => {
    setFormat(next);
    setCanvasSettings(board.id, { format: next });
  };
  const changeBg = (next: string) => {
    setBg(next);
    setCanvasSettings(board.id, { bg: next });
  };

  const exportPdf = async () => {
    setExporting("Preparing…");
    try {
      const { exportMoodboard } = await import("@/lib/pdf");
      await exportMoodboard({ name: board.name, slug: board.slug, format, bg, items: placed, onProgress: setExporting });
    } catch (err) {
      console.error(err);
      alert("Couldn’t make the PDF. Try again.");
    } finally {
      setExporting(null);
    }
  };

  const selectedItem = placed.find((i) => i.id === selected);

  return (
    <div className="grid h-[calc(100dvh-57px)] grid-rows-[auto_1fr] md:grid-cols-[13rem_1fr] md:grid-rows-1">
      {/* Tray: images on this board that aren't on the artboard yet. */}
      <aside className="flex min-h-0 flex-col border-b border-line md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-3 py-3">
          <Link href={`/library/boards/${board.slug}`} className="label text-muted hover:text-ink">
            ← {board.name}
          </Link>
        </div>
        <p className="label px-3 pb-2 text-muted">
          {tray.length ? `Drag onto the board · ${tray.length}` : "Everything’s on the board"}
        </p>
        <ul className="flex min-h-0 gap-2 overflow-auto px-3 pb-3 md:grid md:grid-cols-2 md:content-start">
          {tray.map((item) => (
            <li key={item.id} className="w-20 shrink-0 md:w-auto">
              <button
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/offcut-item", item.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => place(item)}
                title="Drag onto the board, or click to place"
                className="crop-marks block w-full cursor-grab active:cursor-grabbing"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- served from R2 */}
                <img src={item.thumbUrl} alt={item.title ?? ""} className="w-full" draggable={false} />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-2">
          <label className="flex items-center gap-2">
            <span className="label text-muted">Format</span>
            <select value={format} onChange={(e) => changeFormat(e.target.value as FormatId)} className="label border border-line bg-paper px-2 py-1">
              {Object.entries(FORMATS).map(([id, f]) => (
                <option key={id} value={id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1.5" role="group" aria-label="Background">
            <span className="label mr-1 text-muted">Background</span>
            {BACKGROUNDS.map((b) => (
              <button
                key={b.hex}
                title={b.name}
                aria-label={b.name}
                aria-pressed={bg === b.hex}
                onClick={() => changeBg(b.hex)}
                className={`size-5 rounded-full border border-line ${bg === b.hex ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                style={{ background: b.hex }}
              />
            ))}
            <label title="Any colour" className="relative size-5 cursor-pointer overflow-hidden rounded-full border border-line" style={{ background: "conic-gradient(#ff4f4f, #ffd84f, #4fff7a, #4fd8ff, #7a4fff, #ff4fd8, #ff4f4f)" }}>
              <span className="sr-only">Pick any background colour</span>
              <input type="color" value={bg} onChange={(e) => changeBg(e.target.value)} className="absolute inset-0 opacity-0" />
            </label>
          </div>
          {tray.length > 0 && (
            <button onClick={() => arrangeAll(true)} className="label border border-ink px-2.5 py-1">
              Place all
            </button>
          )}
          <button onClick={() => arrangeAll(false)} disabled={!placed.length} className="label border border-line px-2.5 py-1 text-muted hover:text-ink disabled:opacity-40">
            Arrange
          </button>
          <span className="flex-1" />
          <span className="label text-muted" aria-live="polite">
            {status === "saving" ? "Saving…" : status === "unsaved" ? "Unsaved" : status === "error" ? <span className="text-danger">Not saved</span> : "Saved"}
          </span>
          <button onClick={exportPdf} disabled={!placed.length || !!exporting} className="bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50">
            {exporting ?? "Export PDF"}
          </button>
        </div>

        <div
          ref={stage}
          className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-[repeating-linear-gradient(45deg,transparent_0_10px,var(--line)_10px_11px)]"
          onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div
            ref={artboard}
            className="relative overflow-hidden shadow-[0_30px_70px_-30px_rgb(0_0_0/0.55)]"
            style={{ width: ARTBOARD_WIDTH * scale, height: height * scale, background: bg }}
            onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDragOver={(e) => e.dataTransfer.types.includes("text/offcut-item") && e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/offcut-item");
              const item = items.find((i) => i.id === id);
              if (!item) return;
              e.preventDefault();
              place(item, toPoint(e.clientX, e.clientY));
            }}
          >
            {placed.map((item) => {
              const p = item.placement!;
              const isSelected = item.id === selected;
              // Thumbnails are 720px wide; switch to the original when shown bigger than that.
              const src = p.w * scale * dpr > 720 ? item.imageUrl : item.thumbUrl;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
                  className="absolute touch-none select-none"
                  style={{ left: p.x * scale, top: p.y * scale, width: p.w * scale, height: p.h * scale, zIndex: p.z }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setSelected(item.id);
                    // Bring to the front when picked up.
                    if (p.z < topZ) setPlacement(item.id, { ...p, z: topZ + 1 }, false);
                    drag.current = { kind: "move", id: item.id, startX: e.clientX, startY: e.clientY, origin: { x: p.x, y: p.y } };
                  }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- served from R2 */}
                  <img src={src} alt={item.title ?? ""} draggable={false} className="pointer-events-none h-full w-full object-cover" />
                  {isSelected && (
                    <>
                      <span aria-hidden className="pointer-events-none absolute -inset-px outline-2 outline-accent" style={{ outlineStyle: "solid" }} />
                      <span
                        role="slider"
                        aria-label="Resize"
                        aria-valuenow={p.w}
                        tabIndex={-1}
                        className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize border-2 border-paper bg-accent"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          drag.current = { kind: "resize", id: item.id, startX: e.clientX, origin: { w: p.w, h: p.h } };
                        }}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                      />
                    </>
                  )}
                </motion.div>
              );
            })}
            {!placed.length && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
                <p className="max-w-xs mix-blend-difference text-white/70">
                  {tray.length ? "Drag images here from the left, or press Place all." : "Add images to this board first."}
                </p>
              </div>
            )}
          </div>

          <AnimatePresence>
            {selectedItem && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="label absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 bg-ink px-3 py-2 text-paper"
              >
                <button onClick={() => setPlacement(selectedItem.id, { ...selectedItem.placement!, z: topZ + 1 })}>Front</button>
                <button onClick={() => setPlacement(selectedItem.id, { ...selectedItem.placement!, z: Math.min(...placed.map((i) => i.placement!.z)) - 1 })}>Back</button>
                <button
                  onClick={() => {
                    setPlacement(selectedItem.id, null);
                    setSelected(null);
                  }}
                >
                  Take off
                </button>
                <span className="hidden text-paper/50 lg:inline">Arrows nudge · [ ] layers · ⌫ take off</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
