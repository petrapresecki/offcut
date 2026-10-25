import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { items } from "@/db/schema";
import { hammingHex } from "./color";

export const imageUrl = (key: string) => `/api/img/${key}`;

export async function listItems(userId: string) {
  const db = await getDb();
  return db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt));
}

export async function getItem(userId: string, id: string) {
  const db = await getDb();
  return db.query.items.findFirst({ where: and(eq(items.userId, userId), eq(items.id, id)) });
}

/** The closest saved image to this hash, if it's near enough to be the same picture. */
export async function findDuplicate(userId: string, phash: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: items.id, phash: items.phash, thumbKey: items.thumbKey })
    .from(items)
    .where(eq(items.userId, userId));
  let best: (typeof rows)[number] | null = null;
  let bestDistance = 7; // out of 64 bits; below this two images look the same
  for (const row of rows) {
    const d = hammingHex(row.phash, phash);
    if (d < bestDistance) [best, bestDistance] = [row, d];
  }
  return best && { id: best.id, thumbUrl: imageUrl(best.thumbKey) };
}
