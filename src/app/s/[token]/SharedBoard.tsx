"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Masonry } from "@/components/Grid";
import { Presentation, slidesFor } from "@/components/Presentation";
import type { CanvasItem } from "@/lib/boards";
import { ARTBOARD_WIDTH, artboardHeight, type FormatId } from "@/lib/canvas";
import type { Feedback } from "@/lib/share";
import { addComment, removeOwnComment, setVote } from "../actions";

type Props = {
  token: string;
  board: { id: string; name: string; format: FormatId; bg: string };
  ownerName: string | null;
  items: CanvasItem[];
  feedback: Feedback;
};

type Visitor = { key: string; name: string };
type Vote = Feedback["votes"][number];
type Comment = Feedback["comments"][number];

const STORAGE = "offcut-visitor";

function loadVisitor(): Visitor {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Visitor | null;
    if (saved?.key) return saved;
  } catch {}
  return { key: crypto.randomUUID(), name: "" };
}

function saveVisitor(v: Visitor) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(v));
  } catch {}
}

export function SharedBoard({ token, board, ownerName, items, feedback }: Props) {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [votes, setVotes] = useState<Vote[]>(feedback.votes);
  const [comments, setComments] = useState<Comment[]>(feedback.comments);
  const [presenting, setPresenting] = useState<number | null>(null);
  const [asking, setAsking] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setVisitor(loadVisitor()), []);

  // Voting or commenting needs a name first; ask once, then carry on with what they clicked.
  const withName = (action: (v: Visitor) => void) => {
    if (!visitor) return;
    if (visitor.name) action(visitor);
    else setAsking(() => () => action(loadVisitor()));
  };

  const vote = (itemId: string, value: "up" | "down") =>
    withName(async (v) => {
      const mine = votes.find((x) => x.itemId === itemId && x.clientKey === v.key);
      const next = mine?.vote === value ? null : value; // clicking your vote again takes it back
      setVotes((list) => [
        ...list.filter((x) => !(x.itemId === itemId && x.clientKey === v.key)),
        ...(next ? [{ itemId, clientKey: v.key, name: v.name, vote: next }] : []),
      ]);
      const res = await setVote(token, itemId, v.key, v.name, next);
      if ("error" in res) setError(res.error ?? null);
    });

  const comment = (itemId: string, body: string) =>
    new Promise<boolean>((resolve) =>
      withName(async (v) => {
        const res = await addComment(token, itemId, v.key, v.name, body);
        if ("comment" in res && res.comment) {
          setComments((list) => [...list, res.comment!]);
          resolve(true);
        } else {
          setError(("error" in res && res.error) || "Couldn’t post that.");
          resolve(false);
        }
      }),
    );

  const removeComment = async (id: string) => {
    if (!visitor) return;
    setComments((list) => list.filter((c) => c.id !== id));
    await removeOwnComment(token, id, visitor.key);
  };

  const tally = (itemId: string) => {
    const mine = votes.find((x) => x.itemId === itemId && x.clientKey === visitor?.key)?.vote ?? null;
    const forItem = votes.filter((x) => x.itemId === itemId);
    return { up: forItem.filter((x) => x.vote === "up").length, down: forItem.filter((x) => x.vote === "down").length, mine };
  };

  const hasBoard = items.some((i) => i.placement);
  const slideOffset = slidesFor(items).length - items.length; // 1 when the moodboard is the first slide

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/" className="wordmark inline-flex items-center gap-2 text-base">
          <span aria-hidden className="inline-block size-2.5 bg-accent" />
          offcut
        </Link>
        <button onClick={() => setPresenting(0)} disabled={!items.length} className="bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-50">
          Present
        </button>
      </header>

      <main className="px-4 pt-8 pb-24 sm:px-6">
        <div className="mb-8 max-w-2xl space-y-3">
          <p className="label text-muted">{ownerName ? `Shared by ${ownerName}` : "Shared board"} · {items.length} images</p>
          <h1 className="text-[clamp(2rem,6vw,4rem)] leading-none font-semibold tracking-tight" style={{ fontStretch: "112%" }}>
            {board.name}
          </h1>
          <p className="text-muted">Give each image a 👍 or 👎 and leave a note on anything. No account needed.</p>
        </div>

        {error && (
          <p role="alert" className="mb-6 border-l-2 border-danger pl-3 text-sm">
            {error}
          </p>
        )}

        {hasBoard && (
          <button onClick={() => setPresenting(0)} className="crop-marks mb-10 block w-full max-w-4xl text-left" aria-label="Open the moodboard">
            <MoodboardPreview items={items} format={board.format} bg={board.bg} />
          </button>
        )}

        <Masonry>
          {items.map((item, i) => (
            <SharedCard
              key={item.id}
              data-ratio={item.height / item.width}
              item={item}
              tally={tally(item.id)}
              comments={comments.filter((c) => c.itemId === item.id)}
              visitorKey={visitor?.key}
              onOpen={() => setPresenting(i + slideOffset)}
              onVote={(v) => vote(item.id, v)}
              onComment={(body) => comment(item.id, body)}
              onRemoveComment={removeComment}
            />
          ))}
        </Masonry>
      </main>

      {presenting !== null && (
        <Presentation
          name={board.name}
          items={items}
          format={board.format}
          bg={board.bg}
          start={presenting}
          onExit={() => setPresenting(null)}
          renderActions={(item) => <VoteButtons tally={tally(item.id)} onVote={(v) => vote(item.id, v)} dark />}
        />
      )}

      <AnimatePresence>
        {asking && (
          <NamePrompt
            ownerName={ownerName}
            onCancel={() => setAsking(null)}
            onSave={(name) => {
              const v = { ...(visitor ?? loadVisitor()), name };
              saveVisitor(v);
              setVisitor(v);
              const next = asking;
              setAsking(null);
              next();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function VoteButtons({ tally, onVote, dark }: { tally: { up: number; down: number; mine: string | null }; onVote: (v: "up" | "down") => void; dark?: boolean }) {
  const base = `flex items-center gap-1.5 border px-2.5 py-1 text-sm tabular-nums transition-colors ${dark ? "border-white/25" : "border-line"}`;
  const on = dark ? "border-white bg-white text-black" : "border-ink bg-ink text-paper";
  return (
    <div className="flex gap-1.5" role="group" aria-label="Your vote">
      <button aria-pressed={tally.mine === "up"} onClick={() => onVote("up")} className={`${base} ${tally.mine === "up" ? on : ""}`} aria-label={`Yes, ${tally.up} so far`}>
        👍 <span>{tally.up}</span>
      </button>
      <button aria-pressed={tally.mine === "down"} onClick={() => onVote("down")} className={`${base} ${tally.mine === "down" ? on : ""}`} aria-label={`No, ${tally.down} so far`}>
        👎 <span>{tally.down}</span>
      </button>
    </div>
  );
}

type CardProps = {
  item: CanvasItem;
  "data-ratio"?: number;
  tally: { up: number; down: number; mine: string | null };
  comments: Comment[];
  visitorKey?: string;
  onOpen: () => void;
  onVote: (v: "up" | "down") => void;
  onComment: (body: string) => Promise<boolean>;
  onRemoveComment: (id: string) => void;
};

function SharedCard({ item, tally, comments, visitorKey, onOpen, onVote, onComment, onRemoveComment }: CardProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const swatch = item.palette[0]?.hex;
  return (
    <motion.div layout="position" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}>
      <button onClick={onOpen} className="crop-marks group block w-full" aria-label={`Present from ${item.title ?? "this image"}`}>
        <div className="overflow-hidden" style={{ aspectRatio: `${item.width} / ${item.height}`, background: swatch }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- served from R2 */}
          <img src={item.thumbUrl} alt={item.title ?? ""} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.02]" />
        </div>
      </button>
      <div className="mt-2 space-y-2">
        {(item.title || item.credit) && (
          <p className="text-sm">
            {item.title}
            {item.credit && <span className="text-muted"> · {item.credit}</span>}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <VoteButtons tally={tally} onVote={onVote} />
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="label text-muted hover:text-ink">
            {comments.length ? `${comments.length} ${comments.length === 1 ? "note" : "notes"}` : "Add a note"}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <ul className="space-y-2 pt-1">
                {comments.map((c) => (
                  <li key={c.id} className="border-l-2 border-accent pl-2 text-sm">
                    <p className="label text-muted">
                      {c.name}
                      {c.clientKey === visitorKey && (
                        <button onClick={() => onRemoveComment(c.id)} className="ml-2 hover:text-danger">
                          Remove
                        </button>
                      )}
                    </p>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  startTransition(async () => {
                    if (await onComment(draft)) setDraft("");
                  });
                }}
                className="mt-2 flex gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={1000}
                  placeholder="What do you think?"
                  aria-label="Your note"
                  className="min-w-0 flex-1 border-b border-line bg-transparent py-1 text-sm outline-none focus-visible:border-ink focus-visible:outline-none"
                />
                <button disabled={pending || !draft.trim()} className="label bg-ink px-2 py-1 text-paper disabled:opacity-40">
                  Post
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MoodboardPreview({ items, format, bg }: { items: CanvasItem[]; format: FormatId; bg: string }) {
  const placed = useMemo(() => items.filter((i) => i.placement).sort((a, b) => a.placement!.z - b.placement!.z), [items]);
  const h = artboardHeight(format);
  return (
    <div className="relative w-full overflow-hidden shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)]" style={{ aspectRatio: `${ARTBOARD_WIDTH} / ${h}`, background: bg }}>
      {placed.map((i) => {
        const p = i.placement!;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- served from R2
          <img
            key={i.id}
            src={i.thumbUrl}
            alt=""
            className="absolute object-cover"
            style={{ left: `${(p.x / ARTBOARD_WIDTH) * 100}%`, top: `${(p.y / h) * 100}%`, width: `${(p.w / ARTBOARD_WIDTH) * 100}%`, height: `${(p.h / h) * 100}%`, zIndex: p.z }}
          />
        );
      })}
    </div>
  );
}

function NamePrompt({ ownerName, onSave, onCancel }: { ownerName: string | null; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] grid place-items-center bg-black/40 p-4" onClick={onCancel}>
      <motion.form
        initial={{ y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim().slice(0, 60));
        }}
        className="w-full max-w-sm space-y-4 bg-paper p-6 text-ink"
        role="dialog"
        aria-modal
        aria-labelledby="name-title"
      >
        <p id="name-title" className="text-xl font-semibold tracking-tight">What’s your name?</p>
        <p className="text-sm text-muted">So {ownerName ?? "the designer"} knows who said what. It’s only shown on this board.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          className="w-full border-b border-ink bg-transparent py-2 text-lg outline-none focus-visible:outline-none"
        />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="label text-muted hover:text-ink">
            Cancel
          </button>
          <button disabled={!name.trim()} className="bg-ink px-4 py-2 font-medium text-paper disabled:opacity-50">
            Continue
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
