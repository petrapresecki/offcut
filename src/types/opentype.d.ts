// opentype.js 2.0 ships without types; this covers only what src/lib/font-file.ts reads.
declare module "opentype.js" {
  type NameTable = Record<string, Record<string, string>>;
  export interface Font {
    names: NameTable & { windows?: NameTable; unicode?: NameTable; macintosh?: NameTable };
    tables: Record<string, unknown>;
    numGlyphs: number;
  }
  export function parse(buffer: ArrayBuffer): Font;
}
