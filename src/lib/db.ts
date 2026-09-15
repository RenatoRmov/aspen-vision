import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { existsSync, copyFileSync } from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Demo-hosting shim: Vercel's serverless filesystem is read-only outside
 * `/tmp`, and `/tmp` isn't shared across instances or guaranteed to survive
 * a cold start. There's no persistent database configured yet (see
 * `prisma/schema.prisma` header for the Postgres migration path), so on
 * Vercel we seed a working copy into `/tmp` from a pre-built demo dataset
 * bundled with the deployment. Writes during a warm instance's lifetime
 * work normally; a cold start resets to the bundled demo data. Remove this
 * block once a real hosted database is wired up.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  if (process.env.VERCEL) {
    const tmpDb = "/tmp/aspen-demo.db";
    if (!existsSync(tmpDb)) {
      const bundledSeed = path.join(process.cwd(), "prisma", "demo-seed.db");
      copyFileSync(bundledSeed, tmpDb);
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
