"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ItemCard, Masonry } from "@/components/Grid";
import { CATEGORIES } from "@/lib/categories";
import { applyFilters, filtersToQuery, readFilters, type Filters } from "@/lib/filter";
import { ACCEPTED_TYPES, prepareImage, type Prepared } from "@/lib/image";
import type { CardItem } from "@/lib/items";
import { addItemsToBoard, checkDuplicate, createBoard, removeItemsFromBoard, setItemOnBoard } from "./actions";
import { FilterBar } from "./FilterBar";

export type BoardRef = { id: string; name: string; slug: string };

type Upload = {
  key: string;
  preview: string;
  status: "preparing" | "uploading" | "duplicate" | "error";
  message?: string;
  prepared?: Prepared;
  duplicate?: { id: string; thumbUrl: string };
};

type Props = {
  items: CardItem[];
  boards: BoardRef[];
  /** When set, this is a board page: uploads land on the board too. */
  board?: BoardRef;
  heading: React.ReactNode;
  empty: React.ReactNode;
  /** Client feedback per item, shown on board pages. */
  badges?: Record<string, { up: number; down: number; notes: number }>;
};

export function Library({ items, boards, board, heading, empty, badges }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => readFilters(new URLSearchParams(params.toString())));
  const [selecting, setSelecting] = useState(false);
  const [grouped, setGrouped] = useState(false);
  // Grouping is a way of looking, so it's remembered in this browser rather than in the URL.
  useEffect(() => {
    try {
      setGrouped(localStorage.getItem("offcut-group") === "category");
    } catch {}
  }, []);
  const toggleGrouped = () =>
    setGrouped((g) => {
      try {
        localStorage.setItem("offcut-group", g ? "" : "category");
      } catch {}
      return !g;
    });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  // Filters live in the URL so a filtered view can be bookmarked or reached from a swatch.
  const changeFilters = (next: Filters) => {
    setFilters(next);
    window.history.replaceState(null, "", `${window.location.pathname}${filtersToQuery(next)}`);
  };

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
      form.set("meta", JSON.stringify({ width, height, palette, phash, boardId: board?.id }));
      const res = await fetch("/api/items", { method: "POST", body: form }).catch(() => null);
      if (!res?.ok) {
        const body = (await res?.json().catch(() => null)) as { error?: string } | null;
        patch(key, { status: "error", message: body?.error ?? "Couldn’t save. Check your connection." });
        return;
      }
      startTransition(() => router.refresh());
      patch(key, null);
    },
    [router, board?.id],
  );

  const addFiles = useCallback(
    (files: Iterable<File>) => {
      for (const file of files) {
        const key = crypto.randomUUID();
        setUploads((list) => [{ key, preview: URL.createObjectURL(file), status: "preparing" }, ...list]);
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
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
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

  const shown = useMemo(() => applyFilters(items, filters), [items, filters]);
  const categories = useMemo(() => [...new Set(items.flatMap((i) => (i.category ? [i.category] : [])))], [items]);
  const groups = useMemo(() => {
    if (!grouped) return [];
    const order = [...CATEGORIES, null] as (string | null)[];
    return order
      .map((c) => ({ name: c ?? "No category", items: shown.filter((i) => (i.category ?? null) === c) }))
      .filter((g) => g.items.length);
  }, [grouped, shown]);
  const filtered = shown.length !== items.length;

  const card = (item: CardItem) => (
    <ItemCard
      key={item.id}
      data-ratio={item.height / item.width}
      item={item}
      href={`/library/${item.id}`}
      selecting={selecting}
      selected={selected.has(item.id)}
      onToggle={() => toggle(item.id)}
      badge={badges?.[item.id]}
    />
  );

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <main className="px-4 pt-6 pb-32 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {heading}
          <p className="label mt-2 h-4 text-muted" aria-live="polite">
            {filtered ? `Showing ${shown.length} of ${items.length}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <button onClick={toggleGrouped} aria-pressed={grouped} className="label field px-3 py-2 text-muted hover:text-ink aria-pressed:bg-ink aria-pressed:text-paper">
              Group by category
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
              className="label field px-3 py-2 text-muted hover:text-ink"
            >
              {selecting ? "Done" : "Select"}
            </button>
          )}
          <span className="label hidden text-muted lg:inline">Drop, paste ⌘V, or</span>
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-kit bg-ink px-4 py-2 font-medium text-paper transition-transform active:scale-95"
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

      {items.length > 0 && <FilterBar filters={filters} onChange={changeFilters} categories={categories} />}

      {items.length === 0 && uploads.length === 0 ? (
        <div className="crop-marks grid min-h-[60vh] place-items-center field p-8 text-center [--marks-opacity:1]">
          <div className="max-w-md space-y-4">
            {empty}
            <button onClick={() => fileInput.current?.click()} className="rounded-kit bg-ink px-4 py-2 font-medium text-paper">
              Choose images
            </button>
          </div>
        </div>
      ) : shown.length === 0 && uploads.length === 0 ? (
        <div className="grid min-h-[40vh] place-items-center text-center">
          <div className="space-y-3">
            <p className="text-xl font-medium">Nothing matches.</p>
            <button onClick={() => changeFilters({ q: "", color: null, category: null })} className="label text-muted underline underline-offset-2 hover:text-ink">
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-14">
          {(uploads.length > 0 || !grouped) && (
            <Masonry>
              {uploads.map((u) => (
                <UploadCard
                  key={u.key}
                  upload={u}
                  boardName={board?.name}
                  onKeep={() => u.prepared && send(u.key, u.prepared)}
                  onUseExisting={
                    board && u.duplicate
                      ? async () => {
                          await setItemOnBoard(board.id, u.duplicate!.id, true);
                          patch(u.key, null);
                          router.refresh();
                        }
                      : undefined
                  }
                  onDismiss={() => patch(u.key, null)}
                />
              ))}
              {!grouped && shown.map(card)}
            </Masonry>
          )}
          {groups.map((g) => (
            <section key={g.name} aria-label={g.name}>
              <h2 className="title mb-4 text-[clamp(22px,2vw,28px)]">
                {g.name}
                <sup>{g.items.length}</sup>
              </h2>
              <Masonry>{g.items.map(card)}</Masonry>
            </section>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selecting && (
          <SelectionBar
            count={selected.size}
            boards={boards.filter((b) => b.id !== board?.id)}
            currentBoard={board}
            onAll={() => setSelected(new Set(shown.map((i) => i.id)))}
            onDone={() => {
              stopSelecting();
              router.refresh();
            }}
            ids={[...selected]}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-paper/80 p-6 backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} className="crop-marks grid h-full w-full place-items-center border border-dashed border-ink [--marks-opacity:1]">
              <p className="display text-center text-[clamp(3.5rem,9vw,8rem)]">
                {board ? `Drop to save to ${board.name}` : "Drop to save"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function SelectionBar({
  count,
  ids,
  boards,
  currentBoard,
  onAll,
  onDone,
}: {
  count: number;
  ids: string[];
  boards: BoardRef[];
  currentBoard?: BoardRef;
  onAll: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const addTo = (boardId: string) => startTransition(async () => {
    await addItemsToBoard(boardId, ids);
    onDone();
  });

  const removeFromBoard = () => startTransition(async () => {
    if (!currentBoard) return;
    await removeItemsFromBoard(currentBoard.id, ids);
    onDone();
  });

  const createAndAdd = () => startTransition(async () => {
    const res = await createBoard(name);
    if ("board" in res && res.board) {
      await addItemsToBoard(res.board.id, ids);
      onDone();
    }
  });

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-ink px-4 py-3 text-paper sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="label">{count} selected</span>
        <button onClick={onAll} className="label text-paper/70 hover:text-paper">Select all shown</button>
        <span className="flex-1" />
        {naming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createAndAdd();
            }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Board name"
              className="border-b border-paper/40 bg-transparent py-1 outline-none placeholder:text-paper/50 focus-visible:border-paper focus-visible:outline-none"
            />
            <button disabled={!name.trim() || !count || pending} className="label rounded-kit bg-paper px-3 py-1.5 text-ink disabled:opacity-50">
              Create & add
            </button>
          </form>
        ) : (
          <>
            {boards.length > 0 && (
              <select
                disabled={!count || pending}
                value=""
                onChange={(e) => e.target.value && addTo(e.target.value)}
                className="label border border-paper/30 rounded-kit bg-ink px-2 py-1.5 text-paper disabled:opacity-50"
                aria-label="Add selected images to a board"
              >
                <option value="">Add to board…</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            {currentBoard && (
              <button disabled={!count || pending} onClick={removeFromBoard} className="label border border-paper/30 px-3 py-1.5 disabled:opacity-50">
                Remove from board
              </button>
            )}
            <button disabled={!count || pending} onClick={() => setNaming(true)} className="label rounded-kit bg-paper px-3 py-1.5 text-ink disabled:opacity-50">
              New board
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

function UploadCard({
  upload,
  boardName,
  onKeep,
  onUseExisting,
  onDismiss,
}: {
  upload: Upload;
  boardName?: string;
  onKeep: () => void;
  onUseExisting?: () => void;
  onDismiss: () => void;
}) {
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
            <div className="flex flex-wrap gap-2">
              {onUseExisting && (
                <button onClick={onUseExisting} className="label rounded-kit bg-ink px-2 py-1 text-paper">
                  Add that one to {boardName}
                </button>
              )}
              <button onClick={onKeep} className="label field px text-ink-2 py-1">Save anyway</button>
              <button onClick={onDismiss} className="label px-2 py-1 text-muted hover:text-ink">Skip</button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
