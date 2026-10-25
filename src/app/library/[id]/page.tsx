import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { boardIdsForItem, listBoards } from "@/lib/boards";
import { getItem, imageUrl, listItems } from "@/lib/items";
import { ItemDetail } from "./ItemDetail";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await requireUser();
  const item = await getItem(user.id, (await params).id);
  return { title: item?.title ?? "Image" };
}

export default async function ItemPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const item = await getItem(user.id, id);
  if (!item) notFound();

  // Neighbours in library order, for ← / → between images.
  const [all, boards, onBoards] = await Promise.all([listItems(user.id), listBoards(user.id), boardIdsForItem(id)]);
  const ids = all.map((i) => i.id);
  const at = ids.indexOf(id);

  return (
    <ItemDetail
      item={{
        id: item.id,
        imageUrl: imageUrl(item.imageKey),
        thumbUrl: imageUrl(item.thumbKey),
        width: item.width,
        height: item.height,
        palette: item.palette,
        title: item.title ?? "",
        note: item.note ?? "",
        category: item.category ?? "",
        sourceUrl: item.sourceUrl ?? "",
        credit: item.credit ?? "",
        bytes: item.bytes,
        mime: item.mime,
        createdAt: item.createdAt.toISOString(),
      }}
      boards={boards.map(({ id, name, slug }) => ({ id, name, slug }))}
      onBoards={onBoards}
      prevId={ids[at - 1] ?? null}
      nextId={ids[at + 1] ?? null}
    />
  );
}
