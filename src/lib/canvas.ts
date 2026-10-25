// Moodboard artboards. Positions are stored in artboard units: every format is 1600 units wide,
// so a layout keeps its proportions on any screen and maps straight onto the PDF page.
export const ARTBOARD_WIDTH = 1600;

export const FORMATS = {
  a4: { name: "A4 landscape", mm: [297, 210] },
  a3: { name: "A3 landscape", mm: [420, 297] },
  slide: { name: "16:9 slide", mm: [338.67, 190.5] },
  square: { name: "Square", mm: [300, 300] },
  portrait: { name: "A4 portrait", mm: [210, 297] },
} as const;

export type FormatId = keyof typeof FORMATS;

export const isFormat = (v: unknown): v is FormatId => typeof v === "string" && v in FORMATS;

export function artboardHeight(format: FormatId) {
  const [w, h] = FORMATS[format].mm;
  return Math.round((ARTBOARD_WIDTH * h) / w);
}

export const BACKGROUNDS = [
  { name: "Paper", hex: "#f2efe8" },
  { name: "White", hex: "#ffffff" },
  { name: "Ink", hex: "#171614" },
  { name: "Grey", hex: "#8c8a85" },
];

export type Placement = { itemId: string; x: number; y: number; w: number; h: number; z: number };

/**
 * Packs items into justified rows, like a contact sheet: each row is scaled so it spans the
 * artboard. Used for "Arrange" and for placing everything at once.
 */
export function arrange(items: { id: string; width: number; height: number }[], board: { w: number; h: number }, gap = 32): Placement[] {
  if (!items.length) return [];
  const margin = gap * 2;
  const innerW = board.w - margin * 2;
  const innerH = board.h - margin * 2;
  // Try a few row heights and keep the one that fills the artboard best without overflowing.
  let best: Placement[] = [];
  for (let rowH = innerH; rowH > 40; rowH *= 0.9) {
    const rows: { id: string; ratio: number }[][] = [[]];
    let rowW = 0;
    for (const it of items) {
      const ratio = it.width / it.height;
      const w = ratio * rowH;
      if (rowW + w > innerW && rows[rows.length - 1].length) {
        rows.push([]);
        rowW = 0;
      }
      rows[rows.length - 1].push({ id: it.id, ratio });
      rowW += w + gap;
    }
    const placements: Placement[] = [];
    let y = margin;
    for (const row of rows) {
      const ratios = row.reduce((s, r) => s + r.ratio, 0);
      // Scale the row to the full width, but never taller than the trial height.
      const h = Math.min(rowH, (innerW - gap * (row.length - 1)) / ratios);
      const rowWidth = ratios * h + gap * (row.length - 1);
      let x = margin + (innerW - rowWidth) / 2;
      for (const r of row) {
        const w = r.ratio * h;
        placements.push({ itemId: r.id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), z: placements.length + 1 });
        x += w + gap;
      }
      y += h + gap;
    }
    const usedH = y - gap - margin;
    if (usedH <= innerH) {
      // Centre the block vertically.
      const shift = Math.round((innerH - usedH) / 2);
      best = placements.map((p) => ({ ...p, y: p.y + shift }));
      break;
    }
  }
  return best;
}
