import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// The Neon serverless driver talks to Postgres over WebSocket instead of TCP, so
// the same code runs in Node and on Cloudflare Workers. Node 22+ and Workers both
// expose a global WebSocket (`ws` can be supplied instead if that ever changes).
if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Use the Neon *pooled* connection string (the one with "-pooler" in the
  // hostname from the Neon console) so pgBouncer keeps a warm connection to the
  // database, eliminating Neon cold-start delays.
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
