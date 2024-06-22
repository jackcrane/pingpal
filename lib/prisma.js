import { Prisma, PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  // log: ["info"],
});

export { Prisma };
