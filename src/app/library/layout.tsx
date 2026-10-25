import { requireUser } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";
import { signOut } from "../login/actions";
import { NavLinks } from "./NavLinks";

export default async function LibraryLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-6 sm:gap-10">
          <Wordmark href="/library" />
          <NavLinks />
        </div>
        <div className="flex items-center gap-4">
          <span className="label hidden text-muted sm:inline">{user.email}</span>
          <form action={signOut}>
            <button className="label text-muted hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
