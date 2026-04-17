import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { isEmailAllowed, readAdminContact } from "@/lib/email-allow-list";

/**
 * Sign-in errors surfaced via ?error=<code> on this page.
 *   - not_allowed:  email was rejected by the allow-list (pre-send check OR
 *                   NextAuth callback rejection after clicking a stale link)
 *   - access_denied: NextAuth's own code for the same case (mapped to the
 *                    same UI copy so users don't care which path it came via)
 *   - send_failed:  Resend / network failure
 *   - default:      generic fallback ("try again")
 */
async function sendMagicLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;

  // Pre-send guard: don't burn a Resend quota + don't mail someone a link
  // that won't work. Redirect back to the sign-in page with a friendly
  // error so they know to contact the admin.
  if (!isEmailAllowed(email)) {
    console.warn(
      `[sign-in] Rejected ${email} pre-send (not in ALLOWED_EMAILS)`,
    );
    redirect(
      `/sign-in?error=not_allowed&email=${encodeURIComponent(email)}`,
    );
  }

  try {
    await signIn("resend", { email, redirectTo: "/" });
  } catch (err) {
    // `signIn` throws a magic NEXT_REDIRECT on success — re-throw so Next.js
    // can honour the redirect. Only actual failures get the error banner.
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("[sign-in] signIn failed", err);
    redirect("/sign-in?error=send_failed");
  }
}

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { error?: string; email?: string };
}) {
  const errorCode = searchParams?.error;
  const attemptedEmail = searchParams?.email;
  const adminContact = readAdminContact();

  const notAllowed =
    errorCode === "not_allowed" ||
    errorCode === "AccessDenied" ||
    errorCode === "access_denied";
  const sendFailed = errorCode === "send_failed";
  const genericError = Boolean(errorCode) && !notAllowed && !sendFailed;

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
        Enter your email — we&apos;ll send you a magic link.
      </p>

      <form action={sendMagicLink} className="mt-8 space-y-3">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={attemptedEmail ?? ""}
          placeholder="you@example.com"
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100 dark:focus:ring-neutral-100"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Send magic link
        </button>
      </form>

      {notAllowed ? (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/40">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            You&apos;re not on the guest list yet.
          </p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
            {attemptedEmail ? (
              <>
                <b className="font-semibold">{attemptedEmail}</b> isn&apos;t
                registered for this pool.{" "}
              </>
            ) : (
              "This email isn't registered for this pool. "
            )}
            Please contact the pool admin
            {adminContact ? (
              <>
                {" "}
                at{" "}
                <b className="font-semibold break-all">
                  {adminContact}
                </b>
              </>
            ) : null}{" "}
            to be added to the game.
          </p>
        </div>
      ) : null}

      {sendFailed ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          We couldn&apos;t send the magic link — please try again in a moment.
        </p>
      ) : null}

      {genericError ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          Something went wrong signing you in. Please try again.
        </p>
      ) : null}

      <p className="mt-10 text-xs text-neutral-500">
        Only emails explicitly added by the pool admin can sign in.
      </p>
    </main>
  );
}
