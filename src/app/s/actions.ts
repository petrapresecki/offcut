"use server";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { comments, votes } from "@/db/schema";
import { sharedBoardForItem } from "@/lib/share";

// Feedback from people a board is shared with. No account: the share token proves they were
// given the link, and the client key (random, kept in their browser) marks what's theirs.
const validKey = (k: string) => /^[0-9a-f-]{36}$/.test(k);
const cleanName = (n: string) => n.trim().replace(/\s+/g, " ").slice(0, 60);

export async function setVote(token: string, itemId: string, clientKey: string, name: string, vote: "up" | "down" | null) {
  const boardId = await sharedBoardForItem(token, itemId);
  const who = cleanName(name);
  if (!boardId || !validKey(clientKey) || !who) return { error: "This link no longer works." };
  const db = await getDb();
  const where = and(eq(votes.boardId, boardId), eq(votes.itemId, itemId), eq(votes.clientKey, clientKey));
  if (vote === null) await db.delete(votes).where(where);
  else if (vote === "up" || vote === "down")
    await db
      .insert(votes)
      .values({ boardId, itemId, clientKey, name: who, vote })
      .onConflictDoUpdate({ target: [votes.boardId, votes.itemId, votes.clientKey], set: { vote, name: who, updatedAt: new Date() } });
  return { ok: true };
}

export async function addComment(token: string, itemId: string, clientKey: string, name: string, body: string) {
  const boardId = await sharedBoardForItem(token, itemId);
  const who = cleanName(name);
  const text = body.trim().slice(0, 1000);
  if (!boardId || !validKey(clientKey) || !who) return { error: "This link no longer works." };
  if (!text) return { error: "Write something first." };
  const db = await getDb();
  const [row] = await db.insert(comments).values({ id: crypto.randomUUID(), boardId, itemId, clientKey, name: who, body: text }).returning();
  return { comment: { id: row.id, itemId, clientKey, name: who, body: text, createdAt: row.createdAt.toISOString() } };
}

export async function removeOwnComment(token: string, commentId: string, clientKey: string) {
  const db = await getDb();
  const row = await db.query.comments.findFirst({ where: and(eq(comments.id, commentId), eq(comments.clientKey, clientKey)) });
  if (!row || !(await sharedBoardForItem(token, row.itemId))) return;
  await db.delete(comments).where(eq(comments.id, commentId));
}
