/**
 * Email allow-list helpers, shared by the sign-in server action and the
 * NextAuth `signIn` callback.
 *
 * The source of truth is the `ALLOWED_EMAILS` env var: a comma-separated
 * list. Emails are normalized (trimmed + lowercased) on both the env side
 * and the input side so whitespace and capitalization don't create false
 * rejections.
 *
 * Behavior when `ALLOWED_EMAILS` is empty:
 *   - Treated as "no allow-list configured" → all emails pass.
 *   - Intentional so local dev and first-time-setup work without friction.
 */

export function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

export function readAllowList(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => normalizeEmail(s))
      .filter((s) => s.length > 0),
  );
}

/**
 * Returns true if the given email should be allowed to sign in.
 *
 * Rules:
 *   - Empty / missing email -> false (defensive).
 *   - Empty allow-list      -> true  (open mode, dev/setup).
 *   - Non-empty allow-list  -> true iff the email is in the list.
 */
export function isEmailAllowed(emailInput: string | null | undefined): boolean {
  if (!emailInput) return false;
  const email = normalizeEmail(emailInput);
  if (email.length === 0) return false;

  const list = readAllowList();
  if (list.size === 0) return true;
  return list.has(email);
}

/**
 * Admin-contact hint shown to rejected sign-in attempts. Optional — returns
 * null if unset so the UI can fall back to generic copy.
 */
export function readAdminContact(): string | null {
  const v = process.env.POOL_ADMIN_CONTACT?.trim();
  return v && v.length > 0 ? v : null;
}
