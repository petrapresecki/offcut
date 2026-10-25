export const CATEGORIES = [
  "Branding & identity",
  "Posters",
  "Packaging",
  "Editorial",
  "Typography",
  "Logos",
  "Illustration",
  "Photography",
  "Signage",
  "Textures",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const isCategory = (v: unknown): v is Category => CATEGORIES.includes(v as Category);
