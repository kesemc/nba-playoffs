"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { PromoteUserInput } from "@/lib/zod-schemas";

export async function setUserAdmin(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const parsed = PromoteUserInput.safeParse({
    userId: formData.get("userId"),
    isAdmin: formData.get("isAdmin") === "true",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  // Prevent demoting yourself to avoid accidental lock-out.
  if (parsed.data.userId === admin.id && parsed.data.isAdmin === false) {
    throw new Error(
      "You can't demote yourself. Ask another admin to do it.",
    );
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { isAdmin: parsed.data.isAdmin },
  });

  revalidatePath("/admin/users");
}
