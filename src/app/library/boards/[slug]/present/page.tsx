import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { boardCanvas, getBoardBySlug } from "@/lib/boards";
import { isFormat } from "@/lib/canvas";
import { Present } from "./Present";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ at?: string }> };

export const metadata: Metadata = { title: "Present" };

export default async function PresentPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const board = await getBoardBySlug(user.id, (await params).slug);
  if (!board) notFound();
  const items = await boardCanvas(user.id, board.id);
  return (
    <Present
      name={board.name}
      slug={board.slug}
      items={items}
      format={isFormat(board.canvasFormat) ? board.canvasFormat : "a4"}
      bg={board.canvasBg}
      start={Number((await searchParams).at) || 0}
    />
  );
}
