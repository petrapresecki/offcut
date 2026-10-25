// Reads a font file in the browser: family, style, designer, foundry and the licence text the
// foundry put inside it. opentype.js handles OTF, TTF and WOFF; WOFF2 would need a separate
// decompressor, and designers almost always have the OTF or TTF anyway.
export const FONT_FORMATS: Record<string, string> = { otf: "font/otf", ttf: "font/ttf", woff: "font/woff" };
export const MAX_FONT_BYTES = 15 * 1024 * 1024;

export type FontMeta = {
  family: string;
  style: string;
  weight: number;
  italic: boolean;
  designer: string | null;
  foundry: string | null;
  foundryUrl: string | null;
  license: string | null;
  licenseUrl: string | null;
  version: string | null;
  glyphs: number;
  format: string;
};

export const fontExtension = (name: string) => name.toLowerCase().split(".").pop() ?? "";
export const isFontFile = (file: File) => fontExtension(file.name) in FONT_FORMATS || fontExtension(file.name) === "woff2";

export async function readFont(file: File): Promise<FontMeta> {
  const ext = fontExtension(file.name);
  if (ext === "woff2") throw new Error(`${file.name} is a WOFF2 web font. Add the OTF or TTF version instead.`);
  if (!(ext in FONT_FORMATS)) throw new Error(`${file.name} isn’t a font file Offcut can read (OTF, TTF or WOFF).`);
  if (file.size > MAX_FONT_BYTES) throw new Error(`${file.name} is over 15 MB.`);

  const { parse } = await import("opentype.js");
  let font;
  try {
    font = parse(await file.arrayBuffer());
  } catch {
    throw new Error(`${file.name} couldn’t be read. The file may be damaged.`);
  }
  const names = (font.names.windows ?? font.names.unicode ?? font.names.macintosh ?? font.names) as Record<string, Record<string, string>>;
  const name = (key: string) => {
    const v = names[key];
    return v ? (v.en ?? Object.values(v)[0] ?? "").trim() || null : null;
  };
  // Typographic family and style group "Mattone Black" under "Mattone" / "Black".
  const family = name("preferredFamily") ?? name("fontFamily") ?? file.name.replace(/\.[^.]+$/, "");
  const style = name("preferredSubfamily") ?? name("fontSubfamily") ?? "Regular";
  const os2 = font.tables.os2 as { usWeightClass?: number; fsSelection?: number } | undefined;
  const post = font.tables.post as { italicAngle?: number } | undefined;
  return {
    family,
    style,
    weight: os2?.usWeightClass ?? 400,
    italic: /italic|oblique/i.test(style) || (post?.italicAngle ?? 0) !== 0,
    designer: name("designer"),
    foundry: name("manufacturer"),
    foundryUrl: name("manufacturerURL"),
    license: name("license"),
    licenseUrl: name("licenseURL"),
    version: name("version"),
    glyphs: font.numGlyphs,
    format: ext,
  };
}

/** Licence text that suggests the font can't be used for client work. A link alone counts as a licence. */
export function licenceWarning(license: string | null, licenseUrl?: string | null) {
  if (!license) return licenseUrl ? null : "No licence in the file. Check where it came from.";
  if (/\b(trial|demo|personal use|non-?commercial|evaluation|not for commercial)\b/i.test(license))
    return "Looks like a trial or personal-use licence. Check before using it for a client.";
  return null;
}
