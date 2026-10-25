import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { itemTags, items, tags, type Swatch } from "@/db/schema";
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
  tags: string[];
};

export async function listItems(userId: string) {
  const db = await getDb();
  return db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt));
}

/** Tag names per item id, for the given items (or all of the user's items). */
export async function tagsByItem(userId: string, itemIds?: string[]) {
  const db = await getDb();
  const rows = await db
    .select({ itemId: itemTags.itemId, name: tags.name })
    .from(itemTags)
    .innerJoin(tags, eq(tags.id, itemTags.tagId))
    .where(itemIds ? and(eq(tags.userId, userId), inArray(itemTags.itemId, itemIds)) : eq(tags.userId, userId))
    .orderBy(tags.name);
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.itemId, [...(map.get(r.itemId) ?? []), r.name]);
  return map;
}

export function toCard(i: typeof items.$inferSelect, tagMap: Map<string, string[]>): CardItem {
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
    tags: tagMap.get(i.id) ?? [],
  };
}

export async function listCards(userId: string) {
  const [rows, tagMap] = await Promise.all([listItems(userId), tagsByItem(userId)]);
  return rows.map((r) => toCard(r, tagMap));
}

export async function getItem(userId: string, id: string) {
  const db = await getDb();
  return db.query.items.findFirst({ where: and(eq(items.userId, userId), eq(items.id, id)) });
}

export async function listTagNames(userId: string) {
  const db = await getDb();
  const rows = await db.select({ name: tags.name }).from(tags).where(eq(tags.userId, userId)).orderBy(tags.name);
  return rows.map((r) => r.name);
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
