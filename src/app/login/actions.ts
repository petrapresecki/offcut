"use server";

import { redirect } from "next/navigation";
import { createSignInLink, endSession, isAllowedEmail, isEmail, normalizeEmail } from "@/lib/auth";

export type SignInState = { status: "idle" | "sent" | "error"; email?: string; message?: string; devLink?: string };

export async function requestSignIn(_: SignInState, form: FormData): Promise<SignInState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  if (!isEmail(email)) return { status: "error", email, message: "That doesn’t look like an email address." };
  if (!(await isAllowedEmail(email))) return { status: "error", email, message: "Offcut is invite-only for now." };
  try {
    const { devLink } = await createSignInLink(email);
    return { status: "sent", email, devLink };
  } catch (err) {
    console.error(err);
    return { status: "error", email, message: "We couldn’t send the link. Try again in a moment." };
  }
}

export async function signOut() {
  await endSession();
  redirect("/");
}
