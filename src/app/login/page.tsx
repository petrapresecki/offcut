import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  if (await getUser()) redirect("/library");
  const { expired } = await searchParams;
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] px-4 py-5 sm:px-8">
      <Wordmark />
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center gap-8 pb-24">
        <div className="space-y-3">
          <h1 className="text-4xl leading-none font-semibold tracking-tight" style={{ fontStretch: "112%" }}>
            Sign in
          </h1>
          <p className="text-muted">We’ll email you a link. No password to remember.</p>
        </div>
        {expired && (
          <p className="border-l-2 border-danger pl-3 text-sm">That link has expired or was already used. Ask for a new one.</p>
        )}
        <SignInForm />
      </div>
    </main>
  );
}
