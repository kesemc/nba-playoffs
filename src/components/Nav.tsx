import Link from "next/link";
import { currentUser } from "@/lib/auth-helpers";
import { signOutAction } from "@/actions/auth";

export default async function Nav() {
  const user = await currentUser();

  return (
    <nav className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3 text-sm">
        <div className="flex items-center gap-5">
          <Link href="/" className="font-semibold tracking-tight">
            NBA Playoffs Pool
          </Link>
          {user ? (
            <>
              <Link href="/" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
                Dashboard
              </Link>
              <Link href="/leaderboard" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
                Leaderboard
              </Link>
              {user.isAdmin ? (
                <Link href="/admin/series" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
                  Admin
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-neutral-500 hidden sm:inline">
                {user.email}
                {user.isAdmin ? (
                  <span className="ml-1 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    admin
                  </span>
                ) : null}
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
