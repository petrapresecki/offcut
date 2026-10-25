import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listBoards } from "@/lib/boards";
import { listCards } from "@/lib/items";
import { Library } from "./Library";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await requireUser();
  const [items, boards] = await Promise.all([listCards(user.id), listBoards(user.id)]);
  return (
    <Library
      items={items}
      boards={boards.map(({ id, name, slug }) => ({ id, name, slug }))}
      heading={
        <h1 className="text-3xl leading-none font-semibold tracking-tight" style={{ fontStretch: "112%" }}>
          Library
        </h1>
      }
      empty={
        <>
          <p className="text-3xl leading-tight font-semibold tracking-tight" style={{ fontStretch: "112%" }}>
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
