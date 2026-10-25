import "server-only";
import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { fonts, itemFonts } from "@/db/schema";

export type FontRow = Awaited<ReturnType<typeof listFonts>>[number];

/** Every font with its file URL and how many images use it, sorted by family then weight. */
export async function listFonts(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ font: fonts, used: count(itemFonts.itemId) })
    .from(fonts)
    .leftJoin(itemFonts, eq(itemFonts.fontId, fonts.id))
    .where(eq(fonts.userId, userId))
    .groupBy(fonts.id)
    .orderBy(asc(fonts.family), asc(fonts.weight), asc(fonts.italic));
  return rows.map(({ font, used }) => ({
    id: font.id,
    family: font.family,
    style: font.style,
    weight: font.weight,
    italic: font.italic,
    url: `/api/img/${font.fileKey}`, // same route as images: only serves the owner's keys
    format: font.format,
    designer: font.designer,
    foundry: font.foundry,
    foundryUrl: font.foundryUrl,
    license: font.license,
    licenseUrl: font.licenseUrl,
    used,
  }));
}

/** Font ids per item, for filtering the library by typeface. */
export async function fontIdsByItem(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ itemId: itemFonts.itemId, fontId: itemFonts.fontId })
    .from(itemFonts)
    .innerJoin(fonts, eq(fonts.id, itemFonts.fontId))
    .where(eq(fonts.userId, userId));
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.itemId, [...(map.get(r.itemId) ?? []), r.fontId]);
  return map;
}

export async function fontIdsForItem(userId: string, itemId: string) {
  const db = await getDb();
  const rows = await db
    .select({ fontId: itemFonts.fontId })
    .from(itemFonts)
    .innerJoin(fonts, eq(fonts.id, itemFonts.fontId))
    .where(and(eq(fonts.userId, userId), eq(itemFonts.itemId, itemId)));
  return rows.map((r) => r.fontId);
}
