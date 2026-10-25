"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { FontRow } from "@/lib/fonts";
import { isFontFile, licenceWarning, readFont } from "@/lib/font-file";
import { faceName, useFontFaces } from "@/lib/use-font-faces";
import { deleteFont } from "../actions";

type Upload = { key: string; name: string; status: "reading" | "saving" | "duplicate" | "error"; message?: string };

const SIZES = [
  { id: "s", label: "S", px: 28 },
  { id: "m", label: "M", px: 56 },
  { id: "l", label: "L", px: 104 },
] as const;

export function Fonts({ fonts }: { fonts: FontRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sample, setSample] = useState("Kept for the halftone");
  const [size, setSize] = useState<(typeof SIZES)[number]["id"]>("m");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const loaded = useFontFaces(fonts);

  // One family per block, styles in weight order (the server already sorts them).
  const families = useMemo(() => {
    const map = new Map<string, FontRow[]>();
    for (const f of fonts) map.set(f.family, [...(map.get(f.family) ?? []), f]);
    return [...map.entries()].map(([family, styles]) => ({ family, styles }));
  }, [fonts]);

  const patch = (key: string, next: Partial<Upload> | null) =>
    setUploads((list) => (next === null ? list.filter((u) => u.key !== key) : list.map((u) => (u.key === key ? { ...u, ...next } : u))));

  const addFiles = useCallback(
    (files: Iterable<File>) => {
      for (const file of files) {
        if (!isFontFile(file)) continue;
        const key = crypto.randomUUID();
        setUploads((list) => [...list, { key, name: file.name, status: "reading" }]);
        (async () => {
          try {
            const meta = await readFont(file);
            patch(key, { status: "saving", name: `${meta.family} ${meta.style}` });
            const form = new FormData();
            form.set("file", file);
            form.set("meta", JSON.stringify(meta));
            const res = await fetch("/api/fonts", { method: "POST", body: form });
            const body = (await res.json().catch(() => null)) as { error?: string; duplicate?: boolean } | null;
            if (!res.ok) throw new Error(body?.error ?? "Couldn’t save that font.");
            if (body?.duplicate) {
              patch(key, { status: "duplicate", message: "Already in your fonts." });
              setTimeout(() => patch(key, null), 4000);
            } else patch(key, null);
            startTransition(() => router.refresh());
          } catch (err) {
            patch(key, { status: "error", message: err instanceof Error ? err.message : "Couldn’t read that font." });
          }
        })();
      }
    },
    [router],
  );

  // Font files dropped anywhere on the page.
  useEffect(() => {
    let depth = 0;
    const has = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => has(e) && (depth++, setDragging(true));
    const leave = (e: DragEvent) => {
      if (!has(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => has(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!has(e)) return;
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

  const px = SIZES.find((s) => s.id === size)!.px;

  return (
    <main className="px-4 pt-6 pb-32 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="title">
          Fonts<sup>{fonts.length}</sup>
        </h1>
        <div className="flex items-center gap-3">
          <span className="label hidden text-muted lg:inline">Drop OTF, TTF or WOFF files, or</span>
          <button onClick={() => input.current?.click()} className="rounded-kit bg-ink px-4 py-2 font-medium text-paper">
            Add fonts
          </button>
          <input
            ref={input}
            type="file"
            accept=".otf,.ttf,.woff,.woff2"
            multiple
            hidden
            onChange={(e) => {
              addFiles([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {fonts.length > 0 && (
        // A type tester, as on every foundry site: the sample text and size change every specimen.
        <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex min-w-64 flex-1 items-center border-b border-line focus-within:border-ink">
            <span className="sr-only">Sample text</span>
            <input
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              placeholder="Type something"
              className="w-full bg-transparent py-2 outline-none focus-visible:outline-none"
            />
          </label>
          <div className="flex gap-1" role="group" aria-label="Sample size">
            {SIZES.map((s) => (
              <button key={s.id} aria-pressed={size === s.id} onClick={() => setSize(s.id)} className="label field w-9 py-1.5 aria-pressed:bg-ink aria-pressed:text-paper">
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <ul className="mb-8 space-y-1">
          {uploads.map((u) => (
            <li key={u.key} className="field flex items-baseline justify-between gap-4 px-3 py-2">
              <span>{u.name}</span>
              <span className={u.status === "error" ? "text-danger" : "text-muted"}>
                {u.status === "reading" && "Reading…"}
                {u.status === "saving" && "Saving…"}
                {(u.status === "duplicate" || u.status === "error") && u.message}
              </span>
              {u.status === "error" && (
                <button onClick={() => patch(u.key, null)} className="label text-muted hover:text-ink">
                  Dismiss
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {fonts.length === 0 && uploads.length === 0 ? (
        <div className="field grid min-h-[50vh] place-items-center p-8 text-center">
          <div className="max-w-md space-y-3">
            <p className="heading text-[clamp(22px,2.4vw,30px)]">Your typefaces, next to the work that uses them.</p>
            <p className="text-muted">
              Drop in OTF, TTF or WOFF files. Offcut reads each font’s name, designer and the licence inside the file, and shows it set in its own face.
            </p>
            <button onClick={() => input.current?.click()} className="rounded-kit bg-ink px-4 py-2 font-medium text-paper">
              Choose font files
            </button>
          </div>
        </div>
      ) : (
        <div>
          {families.map(({ family, styles }) => (
            <Family key={family} family={family} styles={styles} sample={sample} px={px} loaded={loaded} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-paper/85 p-6 backdrop-blur-sm"
          >
            <p className="display text-center text-[clamp(3.5rem,9vw,8rem)]">Drop fonts</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Family({ family, styles, sample, px, loaded }: { family: string; styles: FontRow[]; sample: string; px: number; loaded: Set<string> }) {
  const first = styles[0];
  const warning = licenceWarning(first.license, first.licenseUrl);
  return (
    <section className="border-t border-line pt-4 pb-10" aria-label={family}>
      <header className="mb-4 grid gap-x-6 gap-y-1 md:grid-cols-12">
        <h2 className="heading text-[clamp(20px,1.8vw,26px)] md:col-span-4">
          {family}
          <span className="label ml-2 align-middle text-muted">
            {styles.length} {styles.length === 1 ? "style" : "styles"}
          </span>
        </h2>
        <p className="text-muted md:col-span-4">
          {[first.designer, first.foundry].filter(Boolean).join(" · ") || "Designer unknown"}
          {first.foundryUrl && (
            <>
              {" "}
              <a href={first.foundryUrl} target="_blank" rel="noreferrer" className="link">
                Foundry ↗
              </a>
            </>
          )}
        </p>
        <p className="md:col-span-4 md:text-right">
          <span className={warning ? "text-danger" : "text-muted"}>{warning ?? first.license?.split(/[.\n]/)[0]}</span>
          {first.licenseUrl && (
            <>
              {" "}
              <a href={first.licenseUrl} target="_blank" rel="noreferrer" className="link">
                Licence ↗
              </a>
            </>
          )}
        </p>
      </header>
      <ul>
        {styles.map((f) => (
          <StyleRow key={f.id} font={f} sample={sample} px={px} ready={loaded.has(f.id)} />
        ))}
      </ul>
    </section>
  );
}

function StyleRow({ font, sample, px, ready }: { font: FontRow; sample: string; px: number; ready: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <li className="group grid items-baseline gap-x-6 py-2 md:grid-cols-12">
      <span className="label text-muted md:col-span-2">
        {font.style}
        <span className="block opacity-70">{font.weight}{font.italic ? " italic" : ""} · {font.format.toUpperCase()}</span>
      </span>
      {/* The specimen, set in the font itself, on one line that may run off the edge. */}
      <p
        className="overflow-hidden leading-[1.1] text-ellipsis whitespace-nowrap transition-opacity md:col-span-8"
        style={{ fontFamily: `"${faceName(font.id)}", var(--font-reddit)`, fontSize: px, opacity: ready ? 1 : 0.2 }}
        aria-label={`${font.family} ${font.style}: ${sample}`}
      >
        {sample || font.family}
      </p>
      <span className="flex justify-end gap-4 md:col-span-2">
        {font.used > 0 ? (
          <Link href={`/library?font=${font.id}`} className="link">
            Used in {font.used}
          </Link>
        ) : (
          <span className="text-muted">Not used yet</span>
        )}
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm) {
              setConfirm(true);
              setTimeout(() => setConfirm(false), 3000);
              return;
            }
            startTransition(() => deleteFont(font.id));
          }}
          className="label text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
        >
          {confirm ? "Click again" : "Remove"}
        </button>
      </span>
    </li>
  );
}
