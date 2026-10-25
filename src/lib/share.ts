import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { boardItems, boards, comments, users, votes } from "@/db/schema";
import { boardCanvas } from "./boards";
import { isFormat } from "./canvas";

export const sharedImageUrl = (token: string) => (key: string) => `/api/s/${token}/${key}`;

export async function getSharedBoard(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ board: boards, ownerName: users.name })
    .from(boards)
    .innerJoin(users, eq(users.id, boards.userId))
    .where(and(eq(boards.shareToken, token), eq(boards.isPublic, true)))
    .limit(1);
  if (!row) return null;
  const items = await boardCanvas(row.board.userId, row.board.id, sharedImageUrl(token));
  return {
    board: {
      id: row.board.id,
      name: row.board.name,
      format: isFormat(row.board.canvasFormat) ? row.board.canvasFormat : ("a4" as const),
      bg: row.board.canvasBg,
    },
    ownerName: row.ownerName,
    items,
  };
}

/** Whether this R2 key belongs to an item on the shared board, so the public route can serve it. */
export async function sharedKeyAllowed(token: string, key: string) {
  const shared = await getSharedBoard(token);
  if (!shared) return false;
  return shared.items.some((i) => i.imageUrl.endsWith(`/${key}`) || i.thumbUrl.endsWith(`/${key}`));
}

export type Feedback = {
  votes: { itemId: string; clientKey: string; name: string; vote: "up" | "down" }[];
  comments: { id: string; itemId: string; clientKey: string; name: string; body: string; createdAt: string }[];
};

export async function boardFeedback(boardId: string): Promise<Feedback> {
  const db = await getDb();
  const [v, c] = await Promise.all([
    db.select({ itemId: votes.itemId, clientKey: votes.clientKey, name: votes.name, vote: votes.vote }).from(votes).where(eq(votes.boardId, boardId)),
    db.select().from(comments).where(eq(comments.boardId, boardId)).orderBy(asc(comments.createdAt)),
  ]);
  return {
    votes: v,
    comments: c.map((x) => ({ id: x.id, itemId: x.itemId, clientKey: x.clientKey, name: x.name, body: x.body, createdAt: x.createdAt.toISOString() })),
  };
}

/** True if the item is on the shared board behind this token. Returns the board id. */
export async function sharedBoardForItem(token: string, itemId: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ boardId: boards.id })
    .from(boards)
    .innerJoin(boardItems, eq(boardItems.boardId, boards.id))
    .where(and(eq(boards.shareToken, token), eq(boards.isPublic, true), eq(boardItems.itemId, itemId)))
    .limit(1);
  return row?.boardId ?? null;
}
