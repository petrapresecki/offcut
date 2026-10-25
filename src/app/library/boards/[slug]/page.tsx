import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { boardCards, getBoardBySlug, listBoards } from "@/lib/boards";
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
  const [items, boards] = await Promise.all([boardCards(user.id, board.id), listBoards(user.id)]);
  const ref = { id: board.id, name: board.name, slug: board.slug };
  return (
    <Library
      key={board.id}
      items={items}
      board={ref}
      boards={boards.map(({ id, name, slug }) => ({ id, name, slug }))}
      heading={<BoardHeading board={ref} />}
      empty={
        <>
          <p className="text-3xl leading-tight font-semibold tracking-tight" style={{ fontStretch: "112%" }}>
            {board.name} is empty.
          </p>
          <p className="text-muted">Drop images here to save them straight onto this board, or add them from your library.</p>
        </>
      }
    />
  );
}
