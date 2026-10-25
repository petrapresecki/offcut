"use client";

import { useActionState } from "react";
import { requestSignIn, type SignInState } from "./actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestSignIn, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="space-y-4">
        <p>
          Check your inbox. We sent a link to <strong className="font-medium">{state.email}</strong>.
        </p>
        {state.devLink && (
          <a href={state.devLink} className="link label inline-block">
            Dev only: open the link →
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="email" className="label block text-muted">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        defaultValue={state.email}
        placeholder="you@studio.com"
        className="w-full border-b border-ink bg-transparent py-2 text-lg outline-none placeholder:text-muted/60 focus-visible:border-accent focus-visible:outline-none"
      />
      {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-kit bg-ink py-3 font-medium text-paper transition-opacity disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}
