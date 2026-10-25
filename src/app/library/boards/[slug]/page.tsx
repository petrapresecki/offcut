import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { boardCards, getBoardBySlug, listBoards } from "@/lib/boards";
import { boardFeedback } from "@/lib/share";
import { Library } from "../../Library";
import { BoardHeading } from "./BoardHeading";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await requireUser();
  const board = await getBoardBySlug(user.id, (await params).slug);
  return { title: board?.name ?? "Board" };
}

export default async function BoardPage({ params }: Props) {
  const user = await requireUser();
  const board = await getBoardBySlug(user.id, (await params).slug);
  if (!board) notFound();
  const [items, boards, feedback] = await Promise.all([boardCards(user.id, board.id), listBoards(user.id), boardFeedback(board.id)]);
  const badges: Record<string, { up: number; down: number; notes: number }> = {};
  for (const i of items) {
    const v = feedback.votes.filter((x) => x.itemId === i.id);
    const notes = feedback.comments.filter((c) => c.itemId === i.id).length;
    if (v.length || notes) badges[i.id] = { up: v.filter((x) => x.vote === "up").length, down: v.filter((x) => x.vote === "down").length, notes };
  }
  const ref = { id: board.id, name: board.name, slug: board.slug };
  return (
    <Library
      key={board.id}
      items={items}
      board={ref}
      boards={boards.map(({ id, name, slug }) => ({ id, name, slug }))}
      badges={badges}
      heading={
        <BoardHeading
          key={board.id}
          board={ref}
          shareToken={board.isPublic ? board.shareToken : null}
          comments={feedback.comments.map((c) => ({ ...c, item: items.find((i) => i.id === c.itemId) ?? null }))}
          voters={new Set(feedback.votes.map((v) => v.clientKey)).size}
        />
      }
      empty={
        <>
          <p className="title">
            {board.name} is empty.
          </p>
          <p className="text-muted">Drop images here to save them straight onto this board, or add them from your library.</p>
        </>
      }
    />
  );
}
