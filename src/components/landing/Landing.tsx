import Link from "next/link";
import { CutWordmark } from "@/components/CutWordmark";
import { Wordmark } from "@/components/Wordmark";
import { ColourSearch } from "./ColourSearch";
import { FountainField } from "./FountainField";
import { Poster, posterById } from "./posters";

// What Offcut does, as plain rows with what each one is made of, like a foundry's list of styles.
const ROWS: { name: string; what: string; soon?: boolean }[] = [
  { name: "Save", what: "Drop images in, paste a screenshot, choose a folder of files" },
  { name: "Palettes", what: "Every image’s colours, ready to copy as HEX, RGB or CMYK" },
  { name: "Search by colour", what: "Pick a colour, see everything that has it, best matches first" },
  { name: "Boards", what: "One per client, project or mood; drop images straight onto one" },
  { name: "Moodboards", what: "Lay a board out on A4, A3 or a slide and export it as a PDF" },
  { name: "Sharing", what: "Send a board as a link; your client votes and leaves notes, no account" },
  { name: "Duplicates", what: "Saved it before? Offcut notices, even when it’s a smaller copy" },
  { name: "Save from your phone", what: "Share a photo from your camera roll straight in", soon: true },
];

// A moodboard laid out by hand for the preview, in artboard percentages.
const MOODBOARD = [
  { id: "riso", x: 6, y: 9, w: 19 },
  { id: "kern", x: 28, y: 9, w: 16 },
  { id: "tide", x: 47, y: 9, w: 17 },
  { id: "night", x: 67, y: 9, w: 13 },
  { id: "flora", x: 47, y: 52, w: 15 },
  { id: "mono", x: 83, y: 9, w: 11 },
];

export function Landing({ signedIn }: { signedIn: boolean }) {
  const cta = signedIn ? { href: "/library", label: "Open your library" } : { href: "/login", label: "Start a library" };
  return (
    <div className="min-h-dvh">
      <header className="grid grid-cols-2 items-center gap-4 px-4 py-4 sm:px-5 md:grid-cols-12">
        <Wordmark className="md:col-span-3" />
        <nav className="hidden gap-6 md:col-span-6 md:flex" aria-label="On this page">
          <a href="#what" className="hover:underline">What it does</a>
          <a href="#colour-title" className="hover:underline">Search by colour</a>
          <a href="#moodboards" className="hover:underline">Moodboards</a>
        </nav>
        <Link href={cta.href} className="link justify-self-end md:col-span-3">
          {signedIn ? "Open library" : "Sign in"}
        </Link>
      </header>

      <main>
        {/* The one loud thing: the cut wordmark on a split-fountain print. */}
        <FountainField className="mx-4 flex min-h-[78svh] flex-col justify-between rounded-[10px] p-4 sm:mx-5 sm:p-6">
          <div className="relative z-10 grid gap-6 md:grid-cols-12">
            <p className="max-w-[16em] text-[clamp(22px,2.2vw,32px)] leading-[1.08] tracking-[-0.02em] md:col-span-6">
              A library for the images you couldn’t throw away.
            </p>
            <div className="flex items-start md:col-span-6 md:justify-end">
              <Link href={cta.href} className="rounded-kit bg-[#0c0c0c] px-4 py-2.5 text-[15px] text-[#f1f0ec] transition-transform hover:-translate-y-0.5">
                {cta.label}
              </Link>
            </div>
          </div>
          <div className="relative z-10 -mb-2 sm:-mb-3">
            <CutWordmark animate slip={14} title="Offcut" />
          </div>
        </FountainField>

        <section id="what" className="grid gap-10 px-4 pt-20 sm:px-5 md:grid-cols-12">
          <p className="text-[clamp(22px,2.3vw,31px)] leading-[1.15] tracking-[-0.015em] md:col-span-5">
            Posters, packaging, type, photos from the street. Keep them in one place, find them again by colour, and send them to a client as a moodboard.
            <span className="text-muted"> Your 3,723,018 open tabs can finally close.</span>
          </p>
          <ul className="md:col-span-7">
            {ROWS.map((r) => (
              <li key={r.name} className="field mb-1.5 grid grid-cols-[minmax(0,10rem)_1fr_auto] items-baseline gap-4 px-3 py-2.5 sm:grid-cols-[13rem_1fr_auto]">
                <span className="text-[18px] tracking-[-0.01em]">{r.name}</span>
                <span className="text-[14px] text-muted">{r.what}</span>
                <span className="text-[13px] text-muted">{r.soon ? "Soon" : ""}</span>
              </li>
            ))}
          </ul>
        </section>

        <ColourSearch />

        <section id="moodboards" className="grid gap-6 px-4 pt-8 pb-24 sm:px-5 md:grid-cols-12">
          <div className="md:col-span-4">
            <h2 className="title">Moodboards a client can hold</h2>
            <p className="mt-3 max-w-[26em] text-muted">
              Lay a board out by hand on A4, A3 or a 16:9 slide and export it as a print-ready PDF, with a last page crediting every designer and source. Or send the board as a link and let the client vote.
            </p>
          </div>
          <figure className="m-0 md:col-span-8">
            <div className="relative aspect-[297/210] overflow-hidden rounded-kit bg-[#e6e5df]">
              {MOODBOARD.map((m) => (
                <div key={m.id} className="absolute" style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%` }}>
                  <Poster spec={posterById(m.id)} />
                </div>
              ))}
            </div>
            <figcaption className="label mt-2 flex justify-between text-muted">
              <span>Warm posters, A4 landscape</span>
              <span>Export PDF</span>
            </figcaption>
          </figure>
        </section>
      </main>

      <footer className="grid gap-6 border-t border-line px-4 pt-6 pb-10 text-[13px] sm:px-5 md:grid-cols-12">
        <p className="md:col-span-5">
          Offcut is for graphic designers who keep everything. Made in Zagreb.
        </p>
        <p className="text-muted md:col-span-5">
          Set in Ronzino, Sprat and Necto Mono, open-source typefaces by{" "}
          <a href="https://www.collletttivo.it" className="link" target="_blank" rel="noreferrer">
            Collletttivo
          </a>
          . The posters on this page are drawn for it.
        </p>
        <Link href={cta.href} className="link md:col-span-2 md:justify-self-end">
          {cta.label}
        </Link>
      </footer>
    </div>
  );
}
