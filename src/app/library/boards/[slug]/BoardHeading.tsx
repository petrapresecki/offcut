"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { CardItem } from "@/lib/items";
import { deleteBoard, deleteComment, renameBoard, shareBoard, unshareBoard } from "../../actions";
import type { BoardRef } from "../../Library";

type Comment = { id: string; name: string; body: string; createdAt: string; item: CardItem | null };

type Props = { board: BoardRef; shareToken: string | null; comments: Comment[]; voters: number };

export function BoardHeading({ board, shareToken, comments, voters }: Props) {
  const router = useRouter();
  const [name, setName] = useState(board.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const rename = () => {
    const next = name.trim();
    if (!next || next === board.name) return setName(board.name);
    startTransition(async () => {
      const res = await renameBoard(board.id, next);
      if ("slug" in res && res.slug !== board.slug) router.replace(`/library/boards/${res.slug}`);
    });
  };

  return (
    <div className="space-y-3">
      <Link href="/library/boards" className="label text-muted hover:text-ink">
        ← Boards
      </Link>
      <h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label="Board name"
          size={Math.max(name.length, 6)}
          className="title max-w-full bg-transparent outline-none focus-visible:underline focus-visible:decoration-accent focus-visible:outline-none"
        />
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={`/library/boards/${board.slug}/moodboard`} className="label rounded-kit bg-ink px-2.5 py-1 text-paper">
          Open moodboard →
        </Link>
        <Link href={`/library/boards/${board.slug}/present`} className="label field px text-ink-2.5 py-1">
          Present
        </Link>
        <ShareControl boardId={board.id} initialToken={shareToken} />
        <button
          disabled={pending}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
              return;
            }
            startTransition(async () => {
              await deleteBoard(board.id);
              router.push("/library/boards");
            });
          }}
          className="label text-muted hover:text-danger"
        >
          {confirmDelete ? "Click again to delete the board (images stay in your library)" : "Delete board"}
        </button>
      </div>
      {(comments.length > 0 || voters > 0) && <FeedbackPanel comments={comments} voters={voters} />}
    </div>
  );
}

function ShareControl({ boardId, initialToken }: { boardId: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [pending, startTransition] = useTransition();
  // The origin is only known in the browser; read it after hydration so server and client agree.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = token && origin ? `${origin}/s/${token}` : null;

  if (!token)
    return (
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await shareBoard(boardId);
            if ("token" in res && res.token) setToken(res.token);
          })
        }
        className="label field px-2.5 py-1 text-muted hover:text-ink"
      >
        {pending ? "Making a link…" : "Share with a client"}
      </button>
    );

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="label flex items-center gap-1.5 text-ink">
        <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        Shared
      </span>
      <button
        onClick={async () => {
          if (!url) return;
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="label field px-2.5 py-1 hover:border-ink"
        title={url ?? undefined}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="label text-muted hover:text-ink">
          Open ↗
        </a>
      )}
      <button
        disabled={pending}
        onClick={() => {
          if (!confirmStop) {
            setConfirmStop(true);
            setTimeout(() => setConfirmStop(false), 3000);
            return;
          }
          startTransition(async () => {
            await unshareBoard(boardId);
            setToken(null);
            setConfirmStop(false);
          });
        }}
        className="label text-muted hover:text-danger"
      >
        {confirmStop ? "Click again: the link stops working" : "Stop sharing"}
      </button>
    </span>
  );
}

function FeedbackPanel({ comments, voters }: { comments: Comment[]; voters: number }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(comments);
  const [, startTransition] = useTransition();
  return (
    <div className="max-w-2xl field">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left">
        <span className="text-sm">
          <strong className="font-medium">Client feedback</strong>
          <span className="text-muted">
            {" "}· {voters} {voters === 1 ? "person voted" : "people voted"} · {list.length} {list.length === 1 ? "note" : "notes"}
          </span>
        </span>
        <span className="label text-muted">{open ? "Hide" : "Show"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="divide-y divide-line overflow-hidden border-t border-line">
            {list.length === 0 && <li className="px-3 py-3 text-sm text-muted">No notes yet, only votes. They show on each image below.</li>}
            {list.map((c) => (
              <li key={c.id} className="flex gap-3 px-3 py-3">
                {c.item && (
                  <Link href={`/library/${c.item.id}`} className="block w-12 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- served from R2 */}
                    <img src={c.item.thumbUrl} alt={c.item.title ?? ""} className="w-full" />
                  </Link>
                )}
                <div className="min-w-0 flex-1">
                  <p className="label text-muted">
                    {c.name} · {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                </div>
                <button
                  onClick={() => {
                    setList((l) => l.filter((x) => x.id !== c.id));
                    startTransition(() => deleteComment(c.id));
                  }}
                  className="label self-start text-muted hover:text-danger"
                  aria-label={`Delete note from ${c.name}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
