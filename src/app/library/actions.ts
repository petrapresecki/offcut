"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, notExists } from "drizzle-orm";
import { getBucket, getDb } from "@/db";
import { boardItems, boards, itemTags, items, tags } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { addToBoard, uniqueSlug } from "@/lib/boards";
import { isCategory } from "@/lib/categories";
import { findDuplicate } from "@/lib/items";
import { normalizeTag } from "@/lib/tags";
import { ARTBOARD_WIDTH, artboardHeight, isFormat, type FormatId, type Placement } from "@/lib/canvas";

export async function checkDuplicate(phash: string) {
  const user = await requireUser();
  if (!/^[0-9a-f]{16}$/.test(phash)) return null;
  return findDuplicate(user.id, phash);
}

export type ItemFields = { title: string; note: string; category: string; sourceUrl: string; credit: string };

export async function updateItem(id: string, fields: ItemFields) {
  const user = await requireUser();
  const clean = (v: string, max: number) => v.trim().slice(0, max) || null;
  const sourceUrl = clean(fields.sourceUrl, 2000);
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) return { error: "The source has to be a web link (https://…)." };
  const db = await getDb();
  await db
    .update(items)
    .set({
      title: clean(fields.title, 200),
      note: clean(fields.note, 5000),
      category: isCategory(fields.category) ? fields.category : null,
      sourceUrl,
      credit: clean(fields.credit, 200),
    })
    .where(and(eq(items.id, id), eq(items.userId, user.id)));
  revalidatePath("/library", "layout");
  return { ok: true };
}

export async function deleteItem(id: string) {
  const user = await requireUser();
  const db = await getDb();
  const [row] = await db
    .delete(items)
    .where(and(eq(items.id, id), eq(items.userId, user.id)))
    .returning();
  if (row) await (await getBucket()).delete([row.imageKey, row.thumbKey]);
  await deleteUnusedTags(user.id);
  revalidatePath("/library", "layout");
}

async function ownsItem(userId: string, itemId: string) {
  const db = await getDb();
  return !!(await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.userId, userId)), columns: { id: true } }));
}

async function ownedBoard(userId: string, boardId: string) {
  const db = await getDb();
  return db.query.boards.findFirst({ where: and(eq(boards.id, boardId), eq(boards.userId, userId)) });
}

async function deleteUnusedTags(userId: string) {
  const db = await getDb();
  await db
    .delete(tags)
    .where(and(eq(tags.userId, userId), notExists(db.select().from(itemTags).where(eq(itemTags.tagId, tags.id)))));
}

export async function addTag(itemId: string, rawName: string) {
  const user = await requireUser();
  const name = normalizeTag(rawName);
  if (!name || !(await ownsItem(user.id, itemId))) return;
  const db = await getDb();
  await db.insert(tags).values({ id: crypto.randomUUID(), userId: user.id, name }).onConflictDoNothing();
  const tag = await db.query.tags.findFirst({ where: and(eq(tags.userId, user.id), eq(tags.name, name)) });
  if (tag) await db.insert(itemTags).values({ itemId, tagId: tag.id }).onConflictDoNothing();
  revalidatePath("/library", "layout");
}

export async function removeTag(itemId: string, name: string) {
  const user = await requireUser();
  if (!(await ownsItem(user.id, itemId))) return;
  const db = await getDb();
  const tag = await db.query.tags.findFirst({ where: and(eq(tags.userId, user.id), eq(tags.name, name)) });
  if (!tag) return;
  await db.delete(itemTags).where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tag.id)));
  await deleteUnusedTags(user.id);
  revalidatePath("/library", "layout");
}

export async function createBoard(rawName: string, itemId?: string) {
  const user = await requireUser();
  const name = rawName.trim().slice(0, 80);
  if (!name) return { error: "Give the board a name." };
  const db = await getDb();
  const [board] = await db
    .insert(boards)
    .values({ id: crypto.randomUUID(), userId: user.id, name, slug: await uniqueSlug(user.id, name) })
    .returning();
  if (itemId && (await ownsItem(user.id, itemId))) await addToBoard(board.id, itemId);
  revalidatePath("/library", "layout");
  return { board: { id: board.id, name: board.name, slug: board.slug } };
}

export async function setItemOnBoard(boardId: string, itemId: string, on: boolean) {
  const user = await requireUser();
  if (!(await ownedBoard(user.id, boardId)) || !(await ownsItem(user.id, itemId))) return;
  if (on) await addToBoard(boardId, itemId);
  else {
    const db = await getDb();
    await db.delete(boardItems).where(and(eq(boardItems.boardId, boardId), eq(boardItems.itemId, itemId)));
  }
  revalidatePath("/library", "layout");
}

export async function addItemsToBoard(boardId: string, itemIds: string[]) {
  const user = await requireUser();
  if (!(await ownedBoard(user.id, boardId)) || !itemIds.length) return;
  const db = await getDb();
  const owned = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.userId, user.id), inArray(items.id, itemIds.slice(0, 200))));
  for (const { id } of owned) await addToBoard(boardId, id);
  revalidatePath("/library", "layout");
}

export async function removeItemsFromBoard(boardId: string, itemIds: string[]) {
  const user = await requireUser();
  if (!(await ownedBoard(user.id, boardId)) || !itemIds.length) return;
  const db = await getDb();
  await db.delete(boardItems).where(and(eq(boardItems.boardId, boardId), inArray(boardItems.itemId, itemIds.slice(0, 200))));
  revalidatePath("/library", "layout");
}

export async function renameBoard(boardId: string, rawName: string) {
  const user = await requireUser();
  const name = rawName.trim().slice(0, 80);
  if (!name || !(await ownedBoard(user.id, boardId))) return { error: "Give the board a name." };
  const slug = await uniqueSlug(user.id, name, boardId);
  const db = await getDb();
  await db.update(boards).set({ name, slug }).where(eq(boards.id, boardId));
  revalidatePath("/library", "layout");
  return { slug };
}

export async function saveCanvas(boardId: string, placements: Placement[], unplaced: string[]) {
  const user = await requireUser();
  const board = await ownedBoard(user.id, boardId);
  if (!board) return { error: "Board not found." };
  const height = artboardHeight(isFormat(board.canvasFormat) ? board.canvasFormat : "a4");
  const int = (v: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, Number(v) || 0)));
  const db = await getDb();
  // Items may hang off the artboard edge a little, as on a real desk, but not wander off.
  const writes = [
    ...placements.slice(0, 500).map((p) =>
      db
        .update(boardItems)
        .set({
          x: int(p.x, -ARTBOARD_WIDTH, ARTBOARD_WIDTH * 2),
          y: int(p.y, -height, height * 2),
          w: int(p.w, 16, ARTBOARD_WIDTH * 2),
          h: int(p.h, 16, height * 2),
          z: int(p.z, 0, 100_000),
        })
        .where(and(eq(boardItems.boardId, boardId), eq(boardItems.itemId, p.itemId))),
    ),
    ...unplaced.slice(0, 500).map((itemId) =>
      db
        .update(boardItems)
        .set({ x: null, y: null, w: null, h: null, z: null })
        .where(and(eq(boardItems.boardId, boardId), eq(boardItems.itemId, itemId))),
    ),
  ];
  if (writes.length) await db.batch(writes as [(typeof writes)[number], ...(typeof writes)[number][]]);
  return { ok: true };
}

export async function setCanvasSettings(boardId: string, settings: { format?: string; bg?: string }) {
  const user = await requireUser();
  if (!(await ownedBoard(user.id, boardId))) return;
  const patch: { canvasFormat?: FormatId; canvasBg?: string } = {};
  if (isFormat(settings.format)) patch.canvasFormat = settings.format;
  if (settings.bg && /^#[0-9a-f]{6}$/i.test(settings.bg)) patch.canvasBg = settings.bg.toLowerCase();
  if (!Object.keys(patch).length) return;
  const db = await getDb();
  await db.update(boards).set(patch).where(eq(boards.id, boardId));
}

export async function deleteBoard(boardId: string) {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(boards).where(and(eq(boards.id, boardId), eq(boards.userId, user.id)));
  revalidatePath("/library", "layout");
}
