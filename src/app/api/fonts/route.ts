import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getBucket, getDb } from "@/db";
import { fonts } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { FONT_FORMATS, MAX_FONT_BYTES } from "@/lib/font-file";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const url = (v: unknown) => (typeof v === "string" && /^https?:\/\//.test(v) ? v.slice(0, 500) : null);

// Saves one font file. The browser has already read its names (src/lib/font-file.ts).
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return bad("Sign in first.", 401);
  const form = await req.formData();
  const file = form.get("file");
  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(String(form.get("meta")));
  } catch {
    return bad("Missing font details.");
  }
  if (!(file instanceof File)) return bad("Missing font file.");
  const format = String(meta.format);
  if (!(format in FONT_FORMATS)) return bad("Offcut reads OTF, TTF and WOFF files.");
  if (file.size > MAX_FONT_BYTES) return bad("That font is over 15 MB.");
  const family = text(meta.family, 120);
  const style = text(meta.style, 120) ?? "Regular";
  if (!family) return bad("The font has no name.");

  const db = await getDb();
  const existing = await db.query.fonts.findFirst({
    where: and(eq(fonts.userId, user.id), eq(fonts.family, family), eq(fonts.style, style)),
  });
  if (existing) return NextResponse.json({ duplicate: true, font: { id: existing.id, family, style } });

  const id = crypto.randomUUID();
  const fileKey = `${user.id}/fonts/${id}/font.${format}`;
  await (await getBucket()).put(fileKey, await file.arrayBuffer(), { httpMetadata: { contentType: FONT_FORMATS[format] } });
  const weight = Number(meta.weight);
  const [font] = await db
    .insert(fonts)
    .values({
      id,
      userId: user.id,
      family,
      style,
      weight: Number.isFinite(weight) ? Math.min(1000, Math.max(1, Math.round(weight))) : 400,
      italic: meta.italic === true,
      fileKey,
      format,
      bytes: file.size,
      designer: text(meta.designer, 200),
      foundry: text(meta.foundry, 200),
      foundryUrl: url(meta.foundryUrl),
      license: text(meta.license, 2000),
      licenseUrl: url(meta.licenseUrl),
      version: text(meta.version, 100),
      glyphs: Number.isInteger(meta.glyphs) ? (meta.glyphs as number) : null,
    })
    .returning();
  return NextResponse.json({ font: { id: font.id, family, style } }, { status: 201 });
}
