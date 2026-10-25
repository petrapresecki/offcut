"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Swatch } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";
import { ACCEPTED_TYPES, prepareImage, type Prepared } from "@/lib/image";
import { checkDuplicate } from "./actions";

export type CardItem = {
  id: string;
  thumbUrl: string;
  width: number;
  height: number;
  palette: Swatch[];
  title: string | null;
  category: string | null;
};

type Upload = {
  key: string;
  preview: string;
  name: string;
  status: "preparing" | "uploading" | "duplicate" | "error";
  message?: string;
  prepared?: Prepared;
  duplicate?: { id: string; thumbUrl: string };
};

export function Library({ items }: { items: CardItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const patch = (key: string, next: Partial<Upload> | null) =>
    setUploads((list) =>
      next === null
        ? list.filter((u) => {
            if (u.key === key) URL.revokeObjectURL(u.preview);
            return u.key !== key;
          })
        : list.map((u) => (u.key === key ? { ...u, ...next } : u)),
    );

  const send = useCallback(
    async (key: string, prepared: Prepared) => {
      patch(key, { status: "uploading" });
      const form = new FormData();
      form.set("file", prepared.file);
      form.set("thumb", new File([prepared.thumb], "thumb.jpg", { type: "image/jpeg" }));
      const { width, height, palette, phash } = prepared;
      form.set("meta", JSON.stringify({ width, height, palette, phash }));
      const res = await fetch("/api/items", { method: "POST", body: form }).catch(() => null);
      if (!res?.ok) {
        const body = (await res?.json().catch(() => null)) as { error?: string } | null;
        const message = body?.error ?? "Couldn’t save. Check your connection.";
        patch(key, { status: "error", message });
        return;
      }
      startTransition(() => router.refresh());
      patch(key, null);
    },
    [router],
  );

  const addFiles = useCallback(
    (files: Iterable<File>) => {
      for (const file of files) {
        const key = crypto.randomUUID();
        setUploads((list) => [
          { key, preview: URL.createObjectURL(file), name: file.name, status: "preparing" },
          ...list,
        ]);
        (async () => {
          try {
            const prepared = await prepareImage(file);
            const duplicate = await checkDuplicate(prepared.phash);
            if (duplicate) patch(key, { status: "duplicate", prepared, duplicate });
            else await send(key, prepared);
          } catch (err) {
            patch(key, { status: "error", message: err instanceof Error ? err.message : "Couldn’t read that image." });
          }
        })();
      }
    },
    [send],
  );

  // ⌘V anywhere on the page saves an image from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  // Dropping files anywhere on the window.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      addFiles([...(e.dataTransfer?.files ?? [])]);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [addFiles]);

  const shown = useMemo(() => (category ? items.filter((i) => i.category === category) : items), [items, category]);
  const usedCategories = CATEGORIES.filter((c) => items.some((i) => i.category === c));

  return (
    <main className="px-4 pt-6 pb-24 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl leading-none font-semibold tracking-tight" style={{ fontStretch: "112%" }}>
            Library
          </h1>
          <p className="label mt-2 text-muted">
            {items.length} {items.length === 1 ? "image" : "images"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="label hidden text-muted md:inline">Drop, paste ⌘V, or</span>
          <button
            onClick={() => fileInput.current?.click()}
            className="bg-ink px-4 py-2 font-medium text-paper transition-transform active:scale-95"
          >
            Add images
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            hidden
            onChange={(e) => {
              addFiles([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {usedCategories.length > 0 && (
        <nav aria-label="Filter by category" className="mb-6 flex flex-wrap gap-2">
          {[null, ...usedCategories].map((c) => (
            <button
              key={c ?? "all"}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className="label border border-line px-3 py-1.5 text-muted transition-colors hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {c ?? "All"}
            </button>
          ))}
        </nav>
      )}

      {items.length === 0 && uploads.length === 0 ? (
        <EmptyState onChoose={() => fileInput.current?.click()} />
      ) : (
        <Masonry>
          {uploads.map((u) => (
            <UploadCard
              key={u.key}
              upload={u}
              onKeep={() => u.prepared && send(u.key, u.prepared)}
              onDismiss={() => patch(u.key, null)}
            />
          ))}
          {shown.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </Masonry>
      )}

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-paper/80 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              className="crop-marks grid h-full w-full place-items-center border border-dashed border-ink [--marks-opacity:1]"
            >
              <p className="text-4xl font-semibold tracking-tight" style={{ fontStretch: "125%" }}>
                Drop to save
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/** Shortest-column masonry, so the newest images sit along the top row instead of down the first column. */
function Masonry({ children }: { children: React.ReactNode[] | React.ReactNode }) {
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

  const nodes = (Array.isArray(children) ? children.flat() : [children]) as React.ReactElement<{
    item?: CardItem;
    upload?: Upload;
  }>[];
  const columns: React.ReactElement[][] = Array.from({ length: count }, () => []);
  const heights = new Array(count).fill(0);
  for (const node of nodes) {
    if (!node) continue;
    const { item } = node.props;
    const ratio = item ? item.height / item.width : 1;
    const col = heights.indexOf(Math.min(...heights));
    columns[col].push(node);
    heights[col] += ratio + 0.15;
  }

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

function ItemCard({ item }: { item: CardItem }) {
  return (
    <motion.div layout="position" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}>
      <Link href={`/library/${item.id}`} className="crop-marks group block" aria-label={item.title ?? "Open image"}>
        <div className="overflow-hidden" style={{ aspectRatio: `${item.width} / ${item.height}`, background: item.palette[0]?.hex }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- served from R2; next/image can't optimise on Workers */}
          <img
            src={item.thumbUrl}
            alt={item.title ?? ""}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.02]"
          />
        </div>
        <div className="mt-2 flex h-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {item.palette.map((s) => (
            <span key={s.hex} style={{ background: s.hex, flexGrow: Math.max(s.weight, 0.05) }} />
          ))}
        </div>
      </Link>
    </motion.div>
  );
}

function UploadCard({ upload, onKeep, onDismiss }: { upload: Upload; onKeep: () => void; onDismiss: () => void }) {
  const busy = upload.status === "preparing" || upload.status === "uploading";
  return (
    <motion.div initial={{ opacity: 0, scale: 0.94, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}>
      <div className="crop-marks [--marks-opacity:1]">
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
        <img src={upload.preview} alt="" className={`w-full transition-opacity ${busy ? "opacity-50" : "opacity-100"}`} />
      </div>
      <div className="mt-2 space-y-2">
        {busy && <p className="label animate-pulse text-muted">{upload.status === "preparing" ? "Reading colours…" : "Saving…"}</p>}
        {upload.status === "error" && (
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-danger">{upload.message}</p>
            <button onClick={onDismiss} className="label text-muted hover:text-ink">Dismiss</button>
          </div>
        )}
        {upload.status === "duplicate" && upload.duplicate && (
          <div className="space-y-2">
            <p className="text-sm">
              Already in your library.{" "}
              <Link href={`/library/${upload.duplicate.id}`} className="underline underline-offset-2">
                See it
              </Link>
            </p>
            <div className="flex gap-2">
              <button onClick={onKeep} className="label border border-ink px-2 py-1">Save anyway</button>
              <button onClick={onDismiss} className="label px-2 py-1 text-muted hover:text-ink">Skip</button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ onChoose }: { onChoose: () => void }) {
  return (
    <div className="crop-marks grid min-h-[60vh] place-items-center border border-dashed border-line p-8 text-center [--marks-opacity:1]">
      <div className="max-w-md space-y-4">
        <p className="text-3xl leading-tight font-semibold tracking-tight" style={{ fontStretch: "112%" }}>
          Your offcuts go here.
        </p>
        <p className="text-muted">
          Drop in posters, packaging, type, photos from the street. Paste a screenshot with ⌘V. Every image gets its colour palette on the way in.
        </p>
        <button onClick={onChoose} className="bg-ink px-4 py-2 font-medium text-paper">
          Choose images
        </button>
      </div>
    </div>
  );
}
