import { signIn } from "@/auth";
import { readAdminContact } from "@/lib/email-allow-list";

/**
 * Sign-in errors surfaced via ?error=<code>.
 *
 *   - AccessDenied: our signIn() callback returned false because the
 *     Google account's email isn't on ALLOWED_EMAILS. We show the amber
 *     "contact admin" card.
 *   - OAuthAccountNotLinked: user has an existing account with this email
 *     but from a different provider. With `allowDangerousEmailAccountLinking:
 *     true` on the Google provider this shouldn't fire, but we handle it
 *     defensively in case someone disables that flag.
 *   - Configuration / OAuthCallbackError / others: something is wrong with
 *     the Google OAuth setup on the server. Admin-fixable.
 *   - default: unknown, show the raw code so it can be relayed for debugging.
 */
async function googleSignIn() {
  "use server";
  await signIn("google", { redirectTo: "/" });
}

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const errorCode = searchParams?.error;
  const adminContact = readAdminContact();

  const notAllowed =
    errorCode === "AccessDenied" ||
    errorCode === "access_denied" ||
    errorCode === "OAuthAccountNotLinked";

  const configError =
    errorCode === "Configuration" ||
    errorCode === "OAuthCallbackError" ||
    errorCode === "OAuthSignInError" ||
    errorCode === "Callback";

  const genericError =
    Boolean(errorCode) && !notAllowed && !configError;

  if (errorCode && !notAllowed) {
    console.warn(`[sign-in] error=${errorCode}`);
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-3xl font-bold tracking-tight">
        Sign in to the Playoffs Pool
      </h1>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
        Use the Google account associated with the email you gave the admin.
      </p>

      <form action={googleSignIn} className="mt-8">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50 active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          {/* Official Google "G" mark. Inline SVG avoids an external asset. */}
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2082 1.125-.8418 2.0782-1.7945 2.7164v2.2582h2.9073c1.7018-1.5673 2.6836-3.8736 2.6836-6.6155z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.4673-.8055 5.9564-2.1805l-2.9073-2.2582c-.8055.54-1.8368.8618-3.0491.8618-2.3441 0-4.3282-1.5832-5.0359-3.7105H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.9641 10.71c-.18-.54-.2827-1.1168-.2827-1.71 0-.5932.1027-1.17.2827-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.9641 10.71z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.43 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>
      </form>

      {notAllowed ? (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/40">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            You&apos;re not on the guest list yet.
          </p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
            The Google account you used isn&apos;t registered for this pool.
            Please contact the pool admin
            {adminContact ? (
              <>
                {" "}at{" "}
                <b className="font-semibold break-all">{adminContact}</b>
              </>
            ) : null}{" "}
            to be added to the game, then try again.
          </p>
        </div>
      ) : null}

      {configError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          <p className="font-medium">Sign-in is misconfigured on the server.</p>
          <p className="mt-1">
            Please contact the pool admin
            {adminContact ? (
              <>
                {" "}at{" "}
                <b className="font-semibold break-all">{adminContact}</b>
              </>
            ) : null}
            .
          </p>
          <p className="mt-2 text-xs opacity-70">
            Error code: <span className="font-mono">{errorCode}</span>
          </p>
        </div>
      ) : null}

      {genericError ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          <p>Something went wrong signing you in. Please try again.</p>
          <p className="mt-2 text-xs opacity-70">
            Error code: <span className="font-mono">{errorCode}</span>
          </p>
        </div>
      ) : null}

      <p className="mt-10 text-xs text-neutral-500">
        Only emails explicitly added by the pool admin can sign in.
      </p>
    </main>
  );
}
