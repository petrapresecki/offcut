"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const path = usePathname();
  const onBoards = path.startsWith("/library/boards");
  const link = "label py-1 transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-4";
  return (
    <nav className="flex items-center gap-4 text-muted">
      <Link href="/library" aria-current={!onBoards && path === "/library" ? "page" : undefined} className={link}>
        Library
      </Link>
      <Link href="/library/boards" aria-current={onBoards ? "page" : undefined} className={link}>
        Boards
      </Link>
    </nav>
  );
}
