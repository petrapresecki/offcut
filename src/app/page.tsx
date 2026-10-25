import Link from "next/link";
import { getUser } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";

// Placeholder landing page; the real one (with the motion showcase) comes later.
export default async function Home() {
  const user = await getUser();
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr_auto] px-4 py-5 sm:px-8">
      <header className="flex items-center justify-between">
        <Wordmark />
        <Link href={user ? "/library" : "/login"} className="label hover:underline">
          {user ? "Open library" : "Sign in"}
        </Link>
      </header>
      <section className="flex flex-col justify-center gap-8 py-16">
        <h1 className="max-w-5xl text-[clamp(3rem,10vw,9rem)] leading-[0.88] font-extrabold tracking-[-0.04em]" style={{ fontStretch: "125%" }}>
          Keep the good <span className="bg-accent px-[0.08em] text-accent-ink">offcuts.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted">
          A library for the posters, packaging, type and photos that inspire you. Save from anywhere, find it again by colour, and close the tab.
        </p>
        <div>
          <Link href={user ? "/library" : "/login"} className="inline-block bg-ink px-5 py-3 font-medium text-paper">
            {user ? "Open your library" : "Start your library"}
          </Link>
        </div>
      </section>
      <footer className="label text-muted">Made for graphic designers</footer>
    </main>
  );
}
