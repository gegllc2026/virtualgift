import { PrismaClient } from "@prisma/client";
import type { DbClient } from "@gateway/core";

export const prisma = new PrismaClient();

/** Prisma satisfies the core DbClient port at runtime. */
export function asDb(client: PrismaClient = prisma): DbClient {
  return client as unknown as DbClient;
}
