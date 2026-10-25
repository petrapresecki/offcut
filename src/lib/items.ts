import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { items, type Swatch } from "@/db/schema";
import { hammingHex } from "./color";

export const imageUrl = (key: string) => `/api/img/${key}`;

/** What the grid needs to draw and filter a card. */
export type CardItem = {
  id: string;
  thumbUrl: string;
  width: number;
  height: number;
  palette: Swatch[];
  title: string | null;
  note: string | null;
  credit: string | null;
  category: string | null;
};

export async function listItems(userId: string) {
  const db = await getDb();
  return db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt));
}

export function toCard(i: typeof items.$inferSelect): CardItem {
  return {
    id: i.id,
    thumbUrl: imageUrl(i.thumbKey),
    width: i.width,
    height: i.height,
    palette: i.palette,
    title: i.title,
    note: i.note,
    credit: i.credit,
    category: i.category,
  };
}

export async function listCards(userId: string) {
  return (await listItems(userId)).map(toCard);
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
