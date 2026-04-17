import { PrismaClient } from "@prisma/client";

// Reuse the Prisma client across hot reloads in dev and across route invocations
// in production. Without this we can exhaust DB connections in Next's dev mode.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
