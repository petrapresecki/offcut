import type { Swatch } from "@/db/schema";
import { hexToRgb, rgbDistance } from "./color";

/** Colours to search by. Picked to be easy to tell apart, not to be exact. */
export const COLOR_PRESETS = [
  { name: "Red", hex: "#d7263d" },
  { name: "Orange", hex: "#f28c28" },
  { name: "Yellow", hex: "#f2c94c" },
  { name: "Green", hex: "#3f8f5b" },
  { name: "Teal", hex: "#2a9d8f" },
  { name: "Blue", hex: "#2b59c3" },
  { name: "Navy", hex: "#1f2a44" },
  { name: "Purple", hex: "#7b4fb3" },
  { name: "Pink", hex: "#ff6fa5" },
  { name: "Brown", hex: "#8b5a3c" },
  { name: "Cream", hex: "#efe6d2" },
  { name: "Black", hex: "#141414" },
  { name: "White", hex: "#fafafa" },
] as const;

const MATCH_DISTANCE = 120; // redmean units; about "clearly the same family"
const MIN_WEIGHT = 0.04; // a colour has to cover at least 4% of the image to count

/** How well an image matches a colour: 0 is no match, higher is better. */
export function colorScore(palette: Swatch[], hex: string) {
  const target = hexToRgb(hex);
  let best = 0;
  for (const s of palette) {
    if (s.weight < MIN_WEIGHT) continue;
    const d = rgbDistance(hexToRgb(s.hex), target);
    if (d > MATCH_DISTANCE) continue;
    // Closer colours score higher, and a colour that fills more of the image scores higher.
    best = Math.max(best, (1 - d / MATCH_DISTANCE) * 0.6 + Math.min(s.weight, 0.6) * (0.4 / 0.6));
  }
  return best;
}

export type Filters = { q: string; color: string | null; category: string | null; font: string | null };

export const emptyFilters: Filters = { q: "", color: null, category: null, font: null };

export function readFilters(params: URLSearchParams): Filters {
  const color = params.get("color");
  return {
    q: params.get("q") ?? "",
    color: color && /^[0-9a-f]{6}$/i.test(color) ? `#${color.toLowerCase()}` : null,
    category: params.get("category"),
    font: params.get("font"),
  };
}

export function filtersToQuery(f: Filters) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.color) params.set("color", f.color.slice(1));
  if (f.category) params.set("category", f.category);
  if (f.font) params.set("font", f.font);
  const s = params.toString();
  return s ? `?${s}` : "";
}

type Filterable = {
  palette: Swatch[];
  title: string | null;
  note: string | null;
  credit: string | null;
  category: string | null;
  fontIds?: string[];
};

/** Applies the filters; with a colour filter, the best matches come first. */
export function applyFilters<T extends Filterable>(items: T[], f: Filters): T[] {
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matched = items.filter((i) => {
    if (f.category && i.category !== f.category) return false;
    if (f.font && !i.fontIds?.includes(f.font)) return false;
    if (words.length) {
      const text = [i.title, i.note, i.credit, i.category].join(" ").toLowerCase();
      if (!words.every((w) => text.includes(w))) return false;
    }
    return true;
  });
  if (!f.color) return matched;
  const color = f.color;
  return matched
    .map((i) => ({ i, score: colorScore(i.palette, color) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.i);
}
