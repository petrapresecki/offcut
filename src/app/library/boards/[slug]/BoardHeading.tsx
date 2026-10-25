"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBoard, renameBoard } from "../../actions";
import type { BoardRef } from "../../Library";

export function BoardHeading({ board }: { board: BoardRef }) {
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
    <div className="space-y-2">
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
          className="max-w-full bg-transparent text-3xl leading-none font-semibold tracking-tight outline-none focus-visible:underline focus-visible:decoration-accent focus-visible:outline-none"
          style={{ fontStretch: "112%" }}
        />
      </h1>
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
  );
}
