// Posters drawn in SVG for the landing page, so it shows no one else's work.
// Each palette is what Offcut would extract from it, which keeps the colour demo honest.
import type { Swatch } from "@/db/schema";

type Kind = "sun" | "dots" | "stripes" | "letter" | "arch" | "blocks";

export type PosterSpec = {
  id: string;
  kind: Kind;
  word: string;
  ratio: number; // height / width
  bg: string;
  ink: string;
  accent: string;
  palette: Swatch[];
};

const p = (id: string, kind: Kind, word: string, ratio: number, bg: string, ink: string, accent: string): PosterSpec => ({
  id,
  kind,
  word,
  ratio,
  bg,
  ink,
  accent,
  palette: [
    { hex: bg, weight: 0.6 },
    { hex: accent, weight: 0.25 },
    { hex: ink, weight: 0.15 },
  ],
});

export const POSTERS: PosterSpec[] = [
  p("riso", "sun", "Riso", 1.4, "#e8412b", "#f4ead5", "#1d1d1b"),
  p("tide", "stripes", "Tide", 1.3, "#1f3a5f", "#f2c14e", "#f7f4ec"),
  p("pack", "blocks", "Pack", 1, "#f4ead5", "#2f6b4f", "#e07a5f"),
  p("night", "dots", "Night", 1.42, "#141414", "#ff4f9a", "#eeeeee"),
  p("flora", "arch", "Flora", 1.3, "#c9d6c2", "#3b3b98", "#f9a03f"),
  p("kern", "letter", "K", 1.25, "#f2c94c", "#141414", "#d7263d"),
  p("sun", "sun", "Sun", 1.2, "#f28c28", "#fff3e0", "#5a1e0e"),
  p("mono", "letter", "a", 1.4, "#efe6d2", "#2b59c3", "#2b59c3"),
  p("grid", "dots", "Grid", 1, "#2a9d8f", "#f4ead5", "#f2c94c"),
  p("plum", "arch", "Plum", 1.35, "#7b4fb3", "#f4ead5", "#ff6fa5"),
  p("slab", "blocks", "Slab", 1.25, "#fafafa", "#141414", "#d7263d"),
  p("wave", "stripes", "Wave", 1.15, "#ff6fa5", "#1f2a44", "#fafafa"),
];

export const posterById = (id: string) => POSTERS.find((x) => x.id === id)!;

type PosterProps = { spec: PosterSpec; className?: string; style?: React.CSSProperties; cover?: boolean };

/** `cover` fills a box of any shape, cropping the poster like object-fit: cover. */
export function Poster({ spec, className = "", style, cover }: PosterProps) {
  const w = 100;
  const h = Math.round(100 * spec.ratio);
  const { bg, ink, accent } = spec;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio={cover ? "xMidYMid slice" : undefined}
      className={`block w-full ${cover ? "h-full" : "h-auto"} ${className}`}
      style={style}
      role="img"
      aria-label={`${spec.word} poster`}
    >
      <rect width={w} height={h} fill={bg} />
      {spec.kind === "sun" && (
        <>
          <circle cx={68} cy={h * 0.34} r={24} fill={accent} />
          <rect y={h * 0.62} width={w} height={h * 0.38} fill={accent} opacity={0.18} />
        </>
      )}
      {spec.kind === "dots" &&
        Array.from({ length: 6 }, (_, row) =>
          Array.from({ length: 6 }, (_, col) => (
            <circle key={`${row}-${col}`} cx={14 + col * 14.5} cy={12 + row * 11} r={(row + col) % 3 === 0 ? 4.5 : 2.2} fill={accent} />
          )),
        )}
      {spec.kind === "stripes" &&
        Array.from({ length: 7 }, (_, i) => <rect key={i} x={0} y={8 + i * 9} width={w} height={4} fill={i % 2 ? accent : ink} opacity={i % 2 ? 1 : 0.9} />)}
      {spec.kind === "arch" && (
        <path d={`M18 ${h * 0.62} V${h * 0.36} A32 32 0 0 1 82 ${h * 0.36} V${h * 0.62} Z`} fill={accent} />
      )}
      {spec.kind === "blocks" && (
        <>
          <rect x={10} y={10} width={48} height={36} fill={accent} />
          <rect x={46} y={34} width={44} height={26} fill={ink} />
        </>
      )}
      {spec.kind === "letter" ? (
        <text x={50} y={h * 0.7} textAnchor="middle" fontSize={92} fontWeight={800} fill={ink} style={{ fontFamily: "var(--font-archivo)", fontStretch: "125%" }}>
          {spec.word}
        </text>
      ) : (
        <text x={8} y={h - 10} fontSize={spec.word.length > 4 ? 21 : 24} fontWeight={800} fill={ink} style={{ fontFamily: "var(--font-archivo)", fontStretch: "112%" }}>
          {spec.word}
        </text>
      )}
      {spec.kind === "letter" && <rect x={8} y={8} width={14} height={4} fill={accent} />}
    </svg>
  );
}
