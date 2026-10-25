import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { boardItems, boards, items } from "@/db/schema";
import { imageUrl, tagsByItem, toCard } from "./items";

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "board"
  );
}

/** Boards with their item count and up to four cover thumbnails, newest board first. */
export async function listBoards(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: boards.id, name: boards.name, slug: boards.slug, count: sql<number>`count(${boardItems.itemId})` })
    .from(boards)
    .leftJoin(boardItems, eq(boardItems.boardId, boards.id))
    .where(eq(boards.userId, userId))
    .groupBy(boards.id)
    .orderBy(desc(boards.createdAt));

  const covers = await db
    .select({ boardId: boardItems.boardId, thumbKey: items.thumbKey, color: sql<string>`json_extract(${items.palette}, '$[0].hex')` })
    .from(boardItems)
    .innerJoin(items, eq(items.id, boardItems.itemId))
    .innerJoin(boards, eq(boards.id, boardItems.boardId))
    .where(eq(boards.userId, userId))
    .orderBy(desc(boardItems.position));
  const coverMap = new Map<string, { url: string; color: string }[]>();
  for (const c of covers) {
    const list = coverMap.get(c.boardId) ?? [];
    if (list.length < 4) list.push({ url: imageUrl(c.thumbKey), color: c.color });
    coverMap.set(c.boardId, list);
  }
  return rows.map((r) => ({ ...r, covers: coverMap.get(r.id) ?? [] }));
}

export async function getBoardBySlug(userId: string, slug: string) {
  const db = await getDb();
  return db.query.boards.findFirst({ where: and(eq(boards.userId, userId), eq(boards.slug, slug)) });
}

export async function boardCards(userId: string, boardId: string) {
  const db = await getDb();
  const rows = await db
    .select({ item: items })
    .from(boardItems)
    .innerJoin(items, eq(items.id, boardItems.itemId))
    .where(and(eq(boardItems.boardId, boardId), eq(items.userId, userId)))
    .orderBy(desc(boardItems.position));
  const tagMap = await tagsByItem(userId, rows.map((r) => r.item.id));
  return rows.map((r) => toCard(r.item, tagMap));
}

/** Ids of the boards this item is on. */
export async function boardIdsForItem(itemId: string) {
  const db = await getDb();
  const rows = await db.select({ boardId: boardItems.boardId }).from(boardItems).where(eq(boardItems.itemId, itemId));
  return rows.map((r) => r.boardId);
}

/** A slug that isn't taken yet by this user's other boards. */
export async function uniqueSlug(userId: string, name: string, exceptBoardId?: string) {
  const db = await getDb();
  const base = slugify(name);
  const taken = new Set(
    (await db.select({ slug: boards.slug, id: boards.id }).from(boards).where(eq(boards.userId, userId)))
      .filter((b) => b.id !== exceptBoardId)
      .map((b) => b.slug),
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Adds an item at the top of a board. The caller checks that both belong to the user. */
export async function addToBoard(boardId: string, itemId: string) {
  const db = await getDb();
  const [{ top }] = await db
    .select({ top: sql<number>`coalesce(max(${boardItems.position}), 0)` })
    .from(boardItems)
    .where(eq(boardItems.boardId, boardId));
  await db.insert(boardItems).values({ boardId, itemId, position: top + 1 }).onConflictDoNothing();
}
