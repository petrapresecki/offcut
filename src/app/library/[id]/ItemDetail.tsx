"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { Swatch } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";
import { hexToRgb, luminance, rgbToCmyk } from "@/lib/color";
import { deleteItem, updateItem, type ItemFields } from "../actions";

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

export function ItemDetail({ item, prevId, nextId }: { item: Detail; prevId: string | null; nextId: string | null }) {
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
            </motion.li>
          );
        })}
      </ul>
      {format === "cmyk" && <p className="text-xs text-muted">CMYK values are approximate. Check against your print profile.</p>}
    </section>
  );
}
