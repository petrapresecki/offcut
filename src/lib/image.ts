// Runs in the browser: Workers can't run native image libraries, and the phone or laptop is
// faster at this anyway. Everything here works from a decoded ImageBitmap.
import type { Swatch } from "@/db/schema";
import { rgbDistance, rgbToHex, type RGB } from "./color";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const MAX_BYTES = 20 * 1024 * 1024;
const THUMB_WIDTH = 720;

export type Prepared = {
  file: File;
  thumb: Blob;
  width: number;
  height: number;
  palette: Swatch[];
  phash: string;
};

export async function prepareImage(file: File): Promise<Prepared> {
  if (!ACCEPTED_TYPES.includes(file.type)) throw new Error("Offcut saves JPG, PNG, WebP, GIF and AVIF images.");
  if (file.size > MAX_BYTES) throw new Error("That image is over 20 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    return {
      file,
      thumb: await thumbnail(bitmap),
      width: bitmap.width,
      height: bitmap.height,
      palette: extractPalette(bitmap),
      phash: differenceHash(bitmap),
    };
  } finally {
    bitmap.close();
  }
}

function draw(bitmap: ImageBitmap, w: number, h: number, background?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { canvas, ctx };
}

function thumbnail(bitmap: ImageBitmap): Promise<Blob> {
  const scale = Math.min(1, THUMB_WIDTH / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  // JPEG because Safari can't encode WebP; transparent areas get a white background.
  const { canvas } = draw(bitmap, w, h, "#ffffff");
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn’t make a thumbnail."))), "image/jpeg", 0.85),
  );
}

/** Median-cut quantisation on a small copy of the image, merged into at most six distinct swatches. */
export function extractPalette(bitmap: ImageBitmap, max = 6): Swatch[] {
  const size = 80;
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const { data } = draw(bitmap, w, h).ctx.getImageData(0, 0, w, h);

  const pixels: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) pixels.push([data[i], data[i + 1], data[i + 2]]);
  if (!pixels.length) return [];

  const boxes: RGB[][] = [pixels];
  while (boxes.length < 16) {
    let best = -1;
    let bestRange = 0;
    let channel = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255;
        let hi = 0;
        for (const p of box) {
          if (p[c] < lo) lo = p[c];
          if (p[c] > hi) hi = p[c];
        }
        if (hi - lo > bestRange) [bestRange, best, channel] = [hi - lo, i, c];
      }
    });
    if (best < 0 || bestRange < 8) break;
    const box = boxes[best].sort((a, b) => a[channel] - b[channel]);
    const mid = box.length >> 1;
    boxes.splice(best, 1, box.slice(0, mid), box.slice(mid));
  }

  const candidates = boxes
    .map((box) => {
      const sum = box.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]);
      return { rgb: sum.map((v) => v / box.length) as RGB, count: box.length };
    })
    .sort((a, b) => b.count - a.count);

  const merged: { rgb: RGB; count: number }[] = [];
  for (const c of candidates) {
    const near = merged.find((m) => rgbDistance(m.rgb, c.rgb) < 60);
    if (near) near.count += c.count;
    else merged.push({ ...c });
  }
  // Colours under 2% of the image are mostly blends along edges, not colours anyone chose.
  const significant = merged.filter((m) => m.count / pixels.length >= 0.02);
  return (significant.length ? significant : merged)
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((m) => ({ hex: rgbToHex(m.rgb), weight: Math.round((m.count / pixels.length) * 1000) / 1000 }));
}

/** 64-bit difference hash: survives resizing and recompression, so re-saves of the same image match. */
export function differenceHash(bitmap: ImageBitmap) {
  const { data } = draw(bitmap, 9, 8, "#ffffff").ctx.getImageData(0, 0, 9, 8);
  const gray = (x: number, y: number) => {
    const i = (y * 9 + x) * 4;
    return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  };
  let hex = "";
  for (let y = 0; y < 8; y++) {
    let nibbleA = 0;
    let nibbleB = 0;
    for (let x = 0; x < 4; x++) nibbleA = (nibbleA << 1) | (gray(x, y) < gray(x + 1, y) ? 1 : 0);
    for (let x = 4; x < 8; x++) nibbleB = (nibbleB << 1) | (gray(x, y) < gray(x + 1, y) ? 1 : 0);
    hex += nibbleA.toString(16) + nibbleB.toString(16);
  }
  return hex;
}
