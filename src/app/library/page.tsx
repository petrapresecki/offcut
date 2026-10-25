import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listBoards } from "@/lib/boards";
import { listFonts } from "@/lib/fonts";
import { listCards } from "@/lib/items";
import { Library } from "./Library";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await requireUser();
  const [items, boards, fonts] = await Promise.all([listCards(user.id), listBoards(user.id), listFonts(user.id)]);
  return (
    <Library
      fontNames={Object.fromEntries(fonts.map((f) => [f.id, `${f.family} ${f.style}`]))}
      items={items}
      boards={boards.map(({ id, name, slug }) => ({ id, name, slug }))}
      heading={
        <h1 className="title">
          Library<sup>{items.length}</sup>
        </h1>
      }
      empty={
        <>
          <p className="title">
            Your offcuts go here.
          </p>
          <p className="text-muted">
            Drop in posters, packaging, type, photos from the street. Paste a screenshot with ⌘V. Every image gets its colour palette on the way in.
          </p>
        </>
      }
    />
  );
}
