import { PrismaClient } from "@prisma/client";

declare global {
  var __PRISMA_CLIENT__: PrismaClient | undefined;
}

const prismaInstance =
  global.__PRISMA_CLIENT__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? [] : ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__PRISMA_CLIENT__ = prismaInstance;
}

export const prisma: PrismaClient = prismaInstance;
export default prismaInstance;