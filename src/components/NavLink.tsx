"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  label: string;
  /**
   * When true, the link is considered active for any pathname that starts with
   * `href` (e.g. /admin matches /admin/series, /admin/users). When false, only
   * an exact pathname match is considered active. Defaults to false.
   */
  matchPrefix?: boolean;
};

export default function NavLink({ href, label, matchPrefix = false }: NavLinkProps) {
  const pathname = usePathname() ?? "";
  const isActive = matchPrefix
    ? pathname === href || pathname.startsWith(`${href}/`)
    : pathname === href;

  const base =
    "rounded-md px-2.5 py-1 text-sm transition-colors";
  const active =
    "bg-neutral-100 text-neutral-900 font-medium dark:bg-neutral-800 dark:text-white";
  const inactive =
    "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800";

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${base} ${isActive ? active : inactive}`}
    >
      {label}
    </Link>
  );
}
