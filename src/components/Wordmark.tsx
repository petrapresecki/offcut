import Link from "next/link";

export function Wordmark({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`wordmark inline-flex items-center gap-2 text-xl ${className}`}>
      <span aria-hidden className="inline-block size-3 bg-accent" />
      offcut
    </Link>
  );
}
