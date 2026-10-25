import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb, getEnv } from "@/db";
import { loginTokens, sessions, users } from "@/db/schema";
import { randomToken, sha256 } from "./crypto";

const SESSION_COOKIE = "offcut_session";
const SESSION_DAYS = 30;
const LINK_MINUTES = 15;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Whether this email may sign in. Without ALLOWED_EMAILS, anyone may in development and nobody in production. */
export async function isAllowedEmail(email: string) {
  const list = (await getEnv()).ALLOWED_EMAILS;
  if (!list) return process.env.NODE_ENV === "development";
  return list.split(",").map(normalizeEmail).includes(normalizeEmail(email));
}

/** Creates a one-time sign-in link. Returns the link itself only in development. */
export async function createSignInLink(email: string): Promise<{ devLink?: string }> {
  const db = await getDb();
  const env = await getEnv();
  const token = randomToken();
  await db.delete(loginTokens).where(lt(loginTokens.expiresAt, new Date()));
  await db.insert(loginTokens).values({
    tokenHash: await sha256(token),
    email,
    expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000),
  });
  const link = `${env.APP_URL}/auth/verify?token=${token}`;

  if (env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? "Offcut <onboarding@resend.dev>",
        to: email,
        subject: "Your Offcut sign-in link",
        text: `Open this link to sign in to Offcut:\n\n${link}\n\nIt works once and expires in ${LINK_MINUTES} minutes.`,
      }),
    });
    if (!res.ok) throw new Error(`Email failed: ${res.status}`);
    return {};
  }
  if (process.env.NODE_ENV === "development") {
    console.log(`\n  Sign-in link for ${email}:\n  ${link}\n`);
    return { devLink: link };
  }
  throw new Error("RESEND_API_KEY is not set");
}

/** Spends a sign-in token and starts a session. Returns false if the token is unknown or expired. */
export async function redeemSignInToken(token: string) {
  const db = await getDb();
  const tokenHash = await sha256(token);
  const [row] = await db.delete(loginTokens).where(eq(loginTokens.tokenHash, tokenHash)).returning();
  if (!row || row.expiresAt < new Date()) return false;

  let user = await db.query.users.findFirst({ where: eq(users.email, row.email) });
  if (!user) [user] = await db.insert(users).values({ id: crypto.randomUUID(), email: row.email }).returning();

  const sessionId = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ idHash: await sha256(sessionId), userId: user.id, expiresAt });
  (await cookies()).set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return true;
}

export const getUser = cache(async () => {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.idHash, await sha256(sessionId)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function endSession() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.idHash, await sha256(sessionId)));
  }
  jar.delete(SESSION_COOKIE);
}
