import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { CutWordmark } from "@/components/CutWordmark";
import { Wordmark } from "@/components/Wordmark";
import { FountainField } from "@/components/landing/FountainField";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  if (await getUser()) redirect("/library");
  const { expired } = await searchParams;
  return (
    <main className="grid min-h-dvh gap-4 p-4 sm:p-5 md:grid-cols-2">
      {/* The same print as the landing page, so signing in feels like walking into the shop. */}
      <FountainField className="hidden flex-col justify-end rounded-[10px] p-6 md:flex">
        <div className="relative z-10">
          <CutWordmark animate slip={14} />
        </div>
      </FountainField>
      <div className="grid grid-rows-[auto_1fr]">
        <Wordmark className="md:invisible" />
        <div className="mx-auto flex w-full max-w-sm flex-col justify-center gap-8 pb-16">
          <div className="space-y-2">
            <h1 className="title">Sign in</h1>
            <p className="text-muted">We’ll email you a link. No password to remember.</p>
          </div>
          {expired && <p className="border-l-2 border-danger pl-3 text-sm">That link has expired or was already used. Ask for a new one.</p>}
          <SignInForm />
        </div>
      </div>
    </main>
  );
}
