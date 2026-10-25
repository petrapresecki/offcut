"use client";

import { useEffect, useState } from "react";

/** The CSS family name an imported font is registered under in this browser. */
export const faceName = (fontId: string) => `offcut-font-${fontId}`;

/**
 * Registers the user's imported fonts with the browser (FontFace API) so specimens can be set
 * in them. Returns the ids that have finished loading.
 */
export function useFontFaces(list: { id: string; url: string }[]) {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const key = list.map((f) => f.id).join(",");

  useEffect(() => {
    let cancelled = false;
    for (const f of list) {
      const name = faceName(f.id);
      if ([...document.fonts].some((face) => face.family === name)) {
        setLoaded((s) => new Set(s).add(f.id));
        continue;
      }
      const face = new FontFace(name, `url(${f.url})`, { display: "swap" });
      document.fonts.add(face);
      face
        .load()
        .then(() => !cancelled && setLoaded((s) => new Set(s).add(f.id)))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the id list is the dependency
  }, [key]);

  return loaded;
}
