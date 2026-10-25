import Link from "next/link";
import { CutWordmark } from "./CutWordmark";

/** The small wordmark for headers: the same cut OFFCUT, at text size. */
export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-block w-[72px] ${className}`} aria-label="Offcut, home">
      <CutWordmark slip={30} />
    </Link>
  );
}
