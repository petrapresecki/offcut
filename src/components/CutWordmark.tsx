"use client";

import { useId } from "react";

/**
 * OFFCUT in Sprat, sliced along one diagonal; the lower part slips along the cut like a
 * sheet that's just been trimmed. Pure SVG, so it fits any width and inherits the text colour.
 * `slip` is how far the lower part has moved along the cut, in viewBox units.
 */
export function CutWordmark({
  text = "OFFCUT",
  slip = 9,
  animate = false,
  className = "",
  title = "Offcut",
}: {
  text?: string;
  slip?: number;
  animate?: boolean;
  className?: string;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  // Sprat Condensed Black sets OFFCUT 1573 units wide at 400px, so 254px fills 1000 units
  // at its natural width (no stretching). Caps run from about y 12 to the baseline at 188.
  const W = 1000;
  const H = 196;
  // The cut runs from lower left to upper right, through the middle of the letters.
  const [y1, y2] = [124, 84];
  const len = Math.hypot(W, y2 - y1);
  const [ux, uy] = [W / len, (y2 - y1) / len];
  const dx = ux * slip;
  const dy = uy * slip + 2.5; // and a hair down, so the cut reads as a gap

  const word = (
    <text
      x="0"
      y="188"
      fontSize="254"
      style={{ fontFamily: "var(--font-sprat), serif", fontVariationSettings: "'wdth' 100, 'wght' 200" }}
      fill="currentColor"
    >
      {text}
    </text>
  );

  return (
    <svg viewBox={`-2 0 ${W + 4 + slip} ${H + 4}`} className={`block w-full overflow-visible ${className}`} role="img" aria-label={title}>
      <defs>
        <clipPath id={`top-${id}`}>
          <polygon points={`-50,-50 ${W + 50},-50 ${W + 50},${y2} -50,${y1}`} />
        </clipPath>
        <clipPath id={`bottom-${id}`}>
          <polygon points={`-50,${y1} ${W + 50},${y2} ${W + 50},${H + 50} -50,${H + 50}`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#top-${id})`}>{word}</g>
      <g
        clipPath={`url(#bottom-${id})`}
        className={animate ? "cut-slip" : undefined}
        style={{ ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, transform: animate ? undefined : `translate(${dx}px, ${dy}px)` }}
      >
        {word}
      </g>
    </svg>
  );
}
