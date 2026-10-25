import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { boardCanvas, getBoardBySlug } from "@/lib/boards";
import { isFormat } from "@/lib/canvas";
import { Moodboard } from "./Moodboard";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await requireUser();
  const board = await getBoardBySlug(user.id, (await params).slug);
  return { title: board ? `${board.name} moodboard` : "Moodboard" };
}

export default async function MoodboardPage({ params }: Props) {
  const user = await requireUser();
  const board = await getBoardBySlug(user.id, (await params).slug);
  if (!board) notFound();
  const items = await boardCanvas(user.id, board.id);
  return (
    <Moodboard
      board={{ id: board.id, name: board.name, slug: board.slug }}
      initialItems={items}
      initialFormat={isFormat(board.canvasFormat) ? board.canvasFormat : "a4"}
      initialBg={board.canvasBg}
    />
  );
}
