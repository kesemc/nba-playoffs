import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Server-side guards. Call these from Server Components, Server Actions,
 * and Route Handlers. Never trust the client.
 */

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) {
    // Distinct from /sign-in: this is an authorization failure, not auth.
    redirect("/?error=forbidden");
  }
  return user;
}

export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}
