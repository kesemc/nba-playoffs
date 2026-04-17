import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { setUserAdmin } from "@/actions/users";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "asc" }],
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Everyone who has signed in with a whitelisted email. Toggle admin
          to let someone else create series and enter results.
        </p>
      </header>

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-2 py-2 text-left">Name</th>
              <th className="px-2 py-2 text-left">Admin</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {users.map((u) => {
              const isSelf = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-2 py-2">{u.name ?? "—"}</td>
                  <td className="px-2 py-2">
                    {u.isAdmin ? (
                      <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        admin
                      </span>
                    ) : (
                      <span className="text-neutral-500">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <form action={setUserAdmin}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="hidden"
                        name="isAdmin"
                        value={u.isAdmin ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        disabled={isSelf && u.isAdmin}
                        title={
                          isSelf && u.isAdmin
                            ? "You can't demote yourself"
                            : undefined
                        }
                        className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        {u.isAdmin ? "Demote" : "Promote"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
