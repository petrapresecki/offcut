import { Wordmark } from "@/components/Wordmark";

export default function SharedNotFound() {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] px-4 py-5 sm:px-8">
      <Wordmark />
      <div className="mx-auto max-w-sm self-center pb-24 text-center">
        <p className="text-2xl font-semibold tracking-tight" style={{ fontStretch: "112%" }}>
          This link doesn’t work any more.
        </p>
        <p className="mt-3 text-muted">The board may have stopped being shared. Ask whoever sent it for a new link.</p>
      </div>
    </main>
  );
}
