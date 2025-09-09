import env from '@baatcheet/env';
import { PrismaClient } from "@prisma/client";

// prevent multiple instances in dev (hot-reload issue)
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}
