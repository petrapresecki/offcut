"use client";

import { useRouter } from "next/navigation";
import { Presentation } from "@/components/Presentation";
import type { CanvasItem } from "@/lib/boards";
import type { FormatId } from "@/lib/canvas";

type Props = { name: string; slug: string; items: CanvasItem[]; format: FormatId; bg: string; start: number };

export function Present({ name, slug, items, format, bg, start }: Props) {
  const router = useRouter();
  if (!items.length)
    return <p className="p-8 text-muted">This board has no images to present yet.</p>;
  return <Presentation name={name} items={items} format={format} bg={bg} start={start} onExit={() => router.push(`/library/boards/${slug}`)} />;
}
