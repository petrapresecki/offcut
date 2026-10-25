// Builds the moodboard PDF in the browser: the images are already here, and Workers have no
// canvas to render with. Loaded only when someone presses Export.
import { jsPDF } from "jspdf";
import type { CanvasItem } from "./boards";
import { ARTBOARD_WIDTH, FORMATS, type FormatId } from "./canvas";
import { hexToRgb } from "./color";

const DPI = 200; // plenty for print proofs without making huge files
const MM_PER_INCH = 25.4;

type Options = {
  name: string;
  slug: string;
  format: FormatId;
  bg: string;
  items: CanvasItem[]; // placed items, back to front
  onProgress?: (label: string) => void;
};

async function loadBitmap(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image failed: ${res.status}`);
  return createImageBitmap(await res.blob());
}

/** Draws the image at the size it will print, flattened onto the board colour, as JPEG. */
function renderForPrint(bitmap: ImageBitmap, wMm: number, hMm: number, bg: string) {
  const scale = Math.min(1, ((wMm / MM_PER_INCH) * DPI) / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round((canvas.width * hMm) / wMm));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export async function exportMoodboard({ name, slug, format, bg, items, onProgress }: Options) {
  const [pageW, pageH] = FORMATS[format].mm;
  const unit = pageW / ARTBOARD_WIDTH; // mm per artboard unit
  const doc = new jsPDF({ unit: "mm", format: [pageW, pageH], orientation: pageW > pageH ? "landscape" : "portrait", compress: true });
  doc.setProperties({ title: `${name} — moodboard`, creator: "Offcut" });

  doc.setFillColor(...hexToRgb(bg));
  doc.rect(0, 0, pageW, pageH, "F");

  for (const [i, item] of items.entries()) {
    onProgress?.(`Adding ${i + 1} of ${items.length}…`);
    const p = item.placement!;
    const bitmap = await loadBitmap(item.imageUrl);
    try {
      const [x, y, w, h] = [p.x * unit, p.y * unit, p.w * unit, p.h * unit];
      // Anything hanging off the artboard is cut off by the page edge, as on screen.
      doc.addImage(renderForPrint(bitmap, w, h, bg), "JPEG", x, y, w, h, undefined, "FAST");
    } finally {
      bitmap.close();
    }
  }

  // Second page: where everything came from, so credit travels with the moodboard.
  onProgress?.("Adding credits…");
  doc.addPage([pageW, pageH], pageW > pageH ? "landscape" : "portrait");
  const ink: [number, number, number] = [23, 22, 20];
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(name, 15, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 106, 98);
  doc.text(`Moodboard · ${items.length} images · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, 15, 27);

  let y = 40;
  const lineGap = 6.5;
  for (const [i, item] of items.entries()) {
    if (y > pageH - 15) {
      doc.addPage([pageW, pageH], pageW > pageH ? "landscape" : "portrait");
      y = 20;
    }
    doc.setTextColor(...ink);
    const label = `${String(i + 1).padStart(2, "0")}  ${item.title ?? "Untitled"}${item.credit ? ` — ${item.credit}` : ""}`;
    doc.text(doc.splitTextToSize(label, pageW / 2 - 20)[0], 15, y);
    if (item.sourceUrl) {
      doc.setTextColor(43, 89, 195);
      const shown = doc.splitTextToSize(item.sourceUrl, pageW / 2 - 10)[0];
      doc.textWithLink(shown, pageW / 2, y, { url: item.sourceUrl });
    }
    y += lineGap;
  }

  onProgress?.("Saving…");
  doc.save(`${slug}-moodboard.pdf`);
}
