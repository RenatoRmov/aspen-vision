import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { existsSync, writeFileSync } from "node:fs";
import { DEMO_SEED_DB_BASE64 } from "./demo-seed-data";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Demo-hosting shim: Vercel's serverless filesystem is read-only outside
 * `/tmp`, and `/tmp` isn't shared across instances or guaranteed to survive
 * a cold start. There's no persistent database configured yet (see
 * `prisma/schema.prisma` header for the Postgres migration path), so on
 * Vercel we materialize a working copy into `/tmp` from a demo dataset
 * embedded directly in the JS bundle (see src/lib/demo-seed-data.ts) —
 * embedding it as a plain import sidesteps Vercel's output file tracing
 * entirely, which is more predictable than trying to bundle a raw file via
 * `outputFileTracingIncludes`. Writes during a warm instance's lifetime
 * work normally; a cold start resets to the bundled demo data. Remove this
 * block once a real hosted database is wired up.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  if (process.env.VERCEL) {
    const tmpDb = "/tmp/aspen-demo.db";
    if (!existsSync(tmpDb)) {
      writeFileSync(tmpDb, Buffer.from(DEMO_SEED_DB_BASE64, "base64"));
    }
    return `file:${tmpDb}`;
  }

  return "file:./dev.db";
}

const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
