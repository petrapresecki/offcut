import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listBoards } from "@/lib/boards";
import { NewBoard } from "./NewBoard";

export const metadata: Metadata = { title: "Boards" };

export default async function BoardsPage() {
  const user = await requireUser();
  const boards = await listBoards(user.id);
  return (
    <main className="px-4 pt-6 pb-24 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="title">
            Boards<sup>{boards.length}</sup>
          </h1>
        </div>
        <NewBoard />
      </div>

      {boards.length === 0 ? (
        <div className="crop-marks grid min-h-[50vh] place-items-center field p-8 text-center [--marks-opacity:1]">
          <div className="max-w-sm space-y-3">
            <p className="title">
              One board per project, client or mood.
            </p>
            <p className="text-muted">Make one here, or select images in your library and add them to a new board.</p>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {boards.map((b) => (
            <li key={b.id}>
              <Link href={`/library/boards/${b.slug}`} className="crop-marks group block">
                {/* Cover: the four most recent images, like prints pinned in a 2×2 grid. */}
                <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1 bg-sheet p-1">
                  {Array.from({ length: 4 }, (_, i) => {
                    const cover = b.covers[i];
                    return cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- served from R2
                      <img
                        key={i}
                        src={cover.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
                        style={{ background: cover.color }}
                      />
                    ) : (
                      <span key={i} className="bg-paper" />
                    );
                  })}
                </div>
                <p className="mt-3 font-medium">{b.name}</p>
                <p className="label text-muted">
                  {b.count} {b.count === 1 ? "image" : "images"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
