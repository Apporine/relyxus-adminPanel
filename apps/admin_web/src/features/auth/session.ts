/** Design-track session cookie. It marks a preview session; it carries no identity. */
export const SESSION_COOKIE = "apc_session";

/**
 * Only same-site paths are allowed after sign in, so `next` can never send someone to
 * another site (open redirect).
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.startsWith("/sign-in")) return "/";
  return next;
}
