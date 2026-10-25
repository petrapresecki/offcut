"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBoard } from "../actions";

export function NewBoard() {
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!naming)
    return (
      <button onClick={() => setNaming(true)} className="rounded-kit bg-ink px-4 py-2 font-medium text-paper">
        New board
      </button>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await createBoard(name);
          if ("error" in res) setError(res.error ?? null);
          else if (res.board) router.push(`/library/boards/${res.board.slug}`);
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setNaming(false)}
        placeholder="Board name"
        aria-label="Board name"
        className="border-b border-ink bg-transparent py-2 outline-none focus-visible:outline-none"
      />
      <button disabled={!name.trim() || pending} className="rounded-kit bg-ink px-4 py-2 font-medium text-paper disabled:opacity-50">
        {pending ? "Creating…" : "Create"}
      </button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
