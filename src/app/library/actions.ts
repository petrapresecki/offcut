"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getBucket, getDb } from "@/db";
import { items } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isCategory } from "@/lib/categories";
import { findDuplicate } from "@/lib/items";

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
  revalidatePath("/library");
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
  revalidatePath("/library");
}
