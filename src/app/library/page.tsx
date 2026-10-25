import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { imageUrl, listItems } from "@/lib/items";
import { Library, type CardItem } from "./Library";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await requireUser();
  const items: CardItem[] = (await listItems(user.id)).map((i) => ({
    id: i.id,
    thumbUrl: imageUrl(i.thumbKey),
    width: i.width,
    height: i.height,
    palette: i.palette,
    title: i.title,
    category: i.category,
  }));
  return <Library items={items} />;
}
