"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { Swatch } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";
import { hexToRgb, luminance, rgbToCmyk } from "@/lib/color";
import { addTag, createBoard, deleteItem, removeTag, setItemOnBoard, updateItem, type ItemFields } from "../actions";
import type { BoardRef } from "../Library";
import { normalizeTag } from "@/lib/tags";

type Detail = ItemFields & {
  id: string;
  imageUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  palette: Swatch[];
  bytes: number;
  mime: string;
  createdAt: string;
};

type Format = "hex" | "rgb" | "cmyk";

function formatSwatch(hex: string, format: Format) {
  const rgb = hexToRgb(hex);
  if (format === "rgb") return rgb.join(", ");
  if (format === "cmyk") return rgbToCmyk(rgb).join(" ");
  return hex.toUpperCase();
}

type Props = {
  item: Detail;
  tags: string[];
  allTags: string[];
  boards: BoardRef[];
  onBoards: string[];
  prevId: string | null;
  nextId: string | null;
};

export function ItemDetail({ item, tags, allTags, boards, onBoards, prevId, nextId }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<ItemFields>(item);
  const saved = useRef<ItemFields>(item);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "Escape") router.push("/library");
      if (e.key === "ArrowLeft" && prevId) router.push(`/library/${prevId}`);
      if (e.key === "ArrowRight" && nextId) router.push(`/library/${nextId}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevId, nextId]);

  const set = (key: keyof ItemFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  // Saves when a field loses focus (or a select changes), and only if something changed.
  const save = async (next = fields) => {
    if (JSON.stringify(next) === JSON.stringify(saved.current)) return;
    setStatus("saving");
    const res = await updateItem(item.id, next);
    if ("error" in res) {
      setStatus("error");
      setError(res.error ?? null);
      return;
    }
    saved.current = next;
    setError(null);
    setStatus("saved");
  };

  const field = "w-full border-b border-line bg-transparent py-1.5 outline-none focus-visible:border-ink focus-visible:outline-none";

  return (
    <main className="grid gap-8 px-4 pt-6 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      <div className="flex flex-col gap-4">
        <nav className="label flex items-center justify-between text-muted">
          <Link href="/library" className="hover:text-ink">← Library</Link>
          <span className="flex gap-4">
            {prevId ? <Link href={`/library/${prevId}`} className="hover:text-ink" aria-label="Previous image">Prev</Link> : <span className="opacity-40">Prev</span>}
            {nextId ? <Link href={`/library/${nextId}`} className="hover:text-ink" aria-label="Next image">Next</Link> : <span className="opacity-40">Next</span>}
          </span>
        </nav>
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
          className="grid place-items-center lg:sticky lg:top-20"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- original from R2 */}
          <img
            src={item.imageUrl}
            alt={fields.title}
            width={item.width}
            height={item.height}
            className="max-h-[calc(100dvh-9rem)] w-auto max-w-full object-contain"
            style={{ backgroundImage: `url(${item.thumbUrl})`, backgroundSize: "cover" }}
          />
        </motion.div>
      </div>

      <aside className="flex flex-col gap-8">
        <Palette palette={item.palette} />

        <section className="space-y-5" aria-label="Details">
          <input value={fields.title} onChange={set("title")} onBlur={() => save()} placeholder="Untitled" aria-label="Title" className={`${field} text-2xl font-semibold tracking-tight`} />
          <label className="block space-y-1">
            <span className="label text-muted">Why I saved it</span>
            <textarea value={fields.note} onChange={set("note")} onBlur={() => save()} rows={3} placeholder="The kerning on the headline, the grain…" className={`${field} resize-y`} />
          </label>
          <label className="block space-y-1">
            <span className="label text-muted">Category</span>
            <select
              value={fields.category}
              onChange={(e) => {
                const next = { ...fields, category: e.target.value };
                setFields(next);
                save(next);
              }}
              className={field}
            >
              <option value="">None</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Tags itemId={item.id} initial={tags} suggestions={allTags} />
          <label className="block space-y-1">
            <span className="label text-muted">Designer / credit</span>
            <input value={fields.credit} onChange={set("credit")} onBlur={() => save()} placeholder="Studio or designer" className={field} />
          </label>
          <label className="block space-y-1">
            <span className="label text-muted">Source link</span>
            <input value={fields.sourceUrl} onChange={set("sourceUrl")} onBlur={() => save()} type="url" placeholder="https://" className={field} />
          </label>
          <p className="label h-4 text-muted" aria-live="polite">
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved"}
            {status === "error" && <span className="text-danger">{error ?? "Couldn’t save."}</span>}
          </p>
        </section>

        <Boards itemId={item.id} boards={boards} initial={onBoards} />

        <section className="label space-y-1 border-t border-line pt-4 text-muted">
          <p>{item.width} × {item.height} px · {item.mime.replace("image/", "").toUpperCase()} · {(item.bytes / 1024 / 1024).toFixed(1)} MB</p>
          <p>Saved {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
          {fields.sourceUrl && /^https?:\/\//.test(fields.sourceUrl) && (
            <p>
              <a href={fields.sourceUrl} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-2">
                Open source ↗
              </a>
            </p>
          )}
        </section>

        <div>
          <button
            disabled={pending}
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
                return;
              }
              startTransition(async () => {
                await deleteItem(item.id);
                router.push(nextId ? `/library/${nextId}` : prevId ? `/library/${prevId}` : "/library");
              });
            }}
            className="label text-muted hover:text-danger"
          >
            {pending ? "Deleting…" : confirmDelete ? "Click again to delete" : "Delete image"}
          </button>
        </div>
      </aside>
    </main>
  );
}

function Palette({ palette }: { palette: Swatch[] }) {
  const [format, setFormat] = useState<Format>("hex");
  const [copied, setCopied] = useState<string | null>(null);
  if (!palette.length) return null;

  const copy = async (hex: string) => {
    await navigator.clipboard.writeText(formatSwatch(hex, format));
    setCopied(hex);
    setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1200);
  };

  return (
    <section aria-label="Colour palette" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="label text-muted">Palette</h2>
        <div className="flex gap-1" role="group" aria-label="Colour format">
          {(["hex", "rgb", "cmyk"] as const).map((f) => (
            <button
              key={f}
              aria-pressed={format === f}
              onClick={() => setFormat(f)}
              className="label px-2 py-0.5 text-muted aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {palette.map((s, i) => {
          const dark = luminance(hexToRgb(s.hex)) < 0.55;
          return (
            <motion.li
              key={s.hex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
            >
              {/* Styled like a paint chip: colour on top, a paper strip with the value below. */}
              <button onClick={() => copy(s.hex)} className="group block w-full text-left" aria-label={`Copy ${formatSwatch(s.hex, format)}`}>
                <span className="relative block aspect-[4/3]" style={{ background: s.hex }}>
                  <span className={`label absolute right-1.5 bottom-1.5 opacity-0 transition-opacity group-hover:opacity-100 ${dark ? "text-white" : "text-black"}`}>
                    {copied === s.hex ? "Copied" : "Copy"}
                  </span>
                </span>
                <span className="label block border-x border-b border-line bg-sheet px-1.5 py-1 text-ink">
                  {formatSwatch(s.hex, format)}
                </span>
              </button>
              <Link href={`/library?color=${s.hex.slice(1)}`} className="label mt-1 block text-muted hover:text-ink">
                Find colour →
              </Link>
            </motion.li>
          );
        })}
      </ul>
      {format === "cmyk" && <p className="text-xs text-muted">CMYK values are approximate. Check against your print profile.</p>}
    </section>
  );
}

function Tags({ itemId, initial, suggestions }: { itemId: string; initial: string[]; suggestions: string[] }) {
  const [tags, setTags] = useState(initial);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const listId = `tag-suggestions-${itemId}`;

  const add = (raw: string) => {
    const name = normalizeTag(raw);
    setDraft("");
    if (!name || tags.includes(name)) return;
    setTags((t) => [...t, name].sort());
    startTransition(() => addTag(itemId, name));
  };
  const remove = (name: string) => {
    setTags((t) => t.filter((x) => x !== name));
    startTransition(() => removeTag(itemId, name));
  };

  return (
    <div className="space-y-2">
      <span className="label block text-muted" id={`${listId}-label`}>Tags</span>
      <ul className="flex flex-wrap gap-1.5" aria-labelledby={`${listId}-label`}>
        {tags.map((t) => (
          <li key={t} className="flex items-center border border-line bg-sheet">
            <Link href={`/library?tag=${encodeURIComponent(t)}`} className="py-0.5 pl-2 text-sm hover:underline">
              #{t}
            </Link>
            <button onClick={() => remove(t)} aria-label={`Remove tag ${t}`} className="px-1.5 text-muted hover:text-danger">
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        value={draft}
        list={listId}
        onChange={(e) => {
          // Typing a comma adds the tag, like most tag fields.
          if (e.target.value.endsWith(",")) add(e.target.value.slice(0, -1));
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
          if (e.key === "Backspace" && !draft && tags.length) remove(tags[tags.length - 1]);
        }}
        onBlur={() => draft && add(draft)}
        placeholder="Add a tag, press Enter"
        aria-label="Add a tag"
        className="w-full border-b border-line bg-transparent py-1.5 text-sm outline-none focus-visible:border-ink focus-visible:outline-none"
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !tags.includes(s)).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

function Boards({ itemId, boards, initial }: { itemId: string; boards: BoardRef[]; initial: string[] }) {
  const [list, setList] = useState(boards);
  const [on, setOn] = useState(new Set(initial));
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) => {
    const next = !on.has(id);
    setOn((s) => {
      const copy = new Set(s);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
    startTransition(() => setItemOnBoard(id, itemId, next));
  };

  const create = () =>
    startTransition(async () => {
      const res = await createBoard(name, itemId);
      if ("board" in res && res.board) {
        const board = res.board;
        setList((l) => [board, ...l]);
        setOn((s) => new Set(s).add(board.id));
        setName("");
        setNaming(false);
      }
    });

  return (
    <section className="space-y-2 border-t border-line pt-4" aria-label="Boards">
      <h2 className="label text-muted">Boards</h2>
      <div className="flex flex-wrap gap-1.5">
        {list.map((b) => (
          <button
            key={b.id}
            aria-pressed={on.has(b.id)}
            onClick={() => toggle(b.id)}
            className="border border-line px-2.5 py-1 text-sm transition-colors hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
          >
            {on.has(b.id) ? "✓ " : "+ "}
            {b.name}
          </button>
        ))}
        {naming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setNaming(false)}
              placeholder="Board name"
              aria-label="New board name"
              className="border-b border-ink bg-transparent py-1 text-sm outline-none focus-visible:outline-none"
            />
            <button disabled={!name.trim() || pending} className="label bg-ink px-2 py-1 text-paper disabled:opacity-50">
              Create
            </button>
          </form>
        ) : (
          <button onClick={() => setNaming(true)} className="label border border-dashed border-line px-2.5 py-1.5 text-muted hover:text-ink">
            New board
          </button>
        )}
      </div>
    </section>
  );
}
