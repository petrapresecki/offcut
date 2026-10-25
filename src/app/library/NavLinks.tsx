"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const path = usePathname();
  const onBoards = path.startsWith("/library/boards");
  const link = "py-1 text-muted transition-colors hover:text-ink aria-[current=page]:text-ink";
  return (
    <nav className="flex items-center gap-5">
      <Link href="/library" aria-current={!onBoards && path === "/library" ? "page" : undefined} className={link}>
        Library
      </Link>
      <Link href="/library/boards" aria-current={onBoards ? "page" : undefined} className={link}>
        Boards
      </Link>
    </nav>
  );
}
