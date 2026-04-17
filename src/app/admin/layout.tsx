import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div>
      <div className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-2 text-xs">
          <span className="font-medium uppercase tracking-wide text-neutral-500">
            Admin
          </span>
          <Link href="/admin/series" className="hover:underline">
            Series
          </Link>
          <Link href="/admin/series/new" className="hover:underline">
            New series
          </Link>
          <Link href="/admin/users" className="hover:underline">
            Users
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
