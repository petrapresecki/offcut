import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { boardFeedback, getSharedBoard } from "@/lib/share";
import { SharedBoard } from "./SharedBoard";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shared = await getSharedBoard((await params).token);
  return { title: shared?.board.name ?? "Shared board", robots: { index: false, follow: false } };
}

// A board someone shared: no account needed to look, vote and comment.
export default async function SharedPage({ params }: Props) {
  const { token } = await params;
  const shared = await getSharedBoard(token);
  if (!shared) notFound();
  const feedback = await boardFeedback(shared.board.id);
  return <SharedBoard token={token} {...shared} feedback={feedback} />;
}
