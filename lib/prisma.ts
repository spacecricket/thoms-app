import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Pass a PoolConfig so @prisma/adapter-pg maintains a connection pool.
  // Use the Neon *pooled* connection string (the one with "-pooler" in the
  // hostname from the Neon console) as DATABASE_URL so pgBouncer keeps a
  // warm connection to the database, eliminating Neon cold-start delays.
  const adapter = new PrismaPg({
    connectionString,
    max: 10,            // max connections in the pool
    idleTimeoutMillis: 30_000,  // release idle connections after 30s
    connectionTimeoutMillis: 5_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
