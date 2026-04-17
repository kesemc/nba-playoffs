import { signIn } from "@/auth";

async function sendMagicLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;
  await signIn("resend", {
    email,
    redirectTo: "/dashboard",
  });
}

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error;
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

      {error ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          Sign-in failed. Double-check your email is on the allow-list and
          try again.
        </p>
      ) : null}

      <p className="mt-10 text-xs text-neutral-500">
        Only emails explicitly added by the pool admin can sign in.
      </p>
    </main>
  );
}
