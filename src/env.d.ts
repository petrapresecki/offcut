// Secrets set with `wrangler secret put` (or .dev.vars locally) aren't in wrangler.jsonc,
// so `wrangler types` can't see them.
interface CloudflareEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  /** Comma-separated emails that may sign in. Kept as a secret so it stays out of the repo. */
  ALLOWED_EMAILS?: string;
}
