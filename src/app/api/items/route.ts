import { NextResponse } from "next/server";
import { getBucket, getDb } from "@/db";
import { items, type Swatch } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { ACCEPTED_TYPES, MAX_BYTES } from "@/lib/image";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

function parseMeta(raw: unknown) {
  try {
    const m = JSON.parse(String(raw));
    const palette: Swatch[] = Array.isArray(m.palette)
      ? m.palette
          .filter((s: Swatch) => /^#[0-9a-f]{6}$/i.test(s?.hex) && typeof s.weight === "number")
          .slice(0, 8)
      : [];
    if (!Number.isInteger(m.width) || !Number.isInteger(m.height) || m.width < 1 || m.height < 1) return null;
    if (typeof m.phash !== "string" || !/^[0-9a-f]{16}$/.test(m.phash)) return null;
    const sourceUrl = typeof m.sourceUrl === "string" && /^https?:\/\//.test(m.sourceUrl) ? m.sourceUrl.slice(0, 2000) : null;
    return { width: m.width as number, height: m.height as number, phash: m.phash as string, palette, sourceUrl };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return bad("Sign in first.", 401);

  const form = await req.formData();
  const file = form.get("file");
  const thumb = form.get("thumb");
  const meta = parseMeta(form.get("meta"));
  if (!(file instanceof File) || !(thumb instanceof File) || !meta) return bad("Missing image data.");
  if (!ACCEPTED_TYPES.includes(file.type)) return bad("Unsupported image type.");
  if (file.size > MAX_BYTES) return bad("That image is over 20 MB.");
  if (thumb.type !== "image/jpeg" || thumb.size > 2 * 1024 * 1024) return bad("Bad thumbnail.");

  const id = crypto.randomUUID();
  const imageKey = `${user.id}/${id}/original.${EXT[file.type]}`;
  const thumbKey = `${user.id}/${id}/thumb.jpg`;
  const bucket = await getBucket();
  await Promise.all([
    bucket.put(imageKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } }),
    bucket.put(thumbKey, await thumb.arrayBuffer(), { httpMetadata: { contentType: "image/jpeg" } }),
  ]);

  const db = await getDb();
  const title = file.name && !/^image\.\w+$/i.test(file.name) ? file.name.replace(/\.[^.]+$/, "").slice(0, 200) : null;
  const [item] = await db
    .insert(items)
    .values({ id, userId: user.id, imageKey, thumbKey, mime: file.type, bytes: file.size, title, ...meta })
    .returning();
  return NextResponse.json({ item }, { status: 201 });
}
