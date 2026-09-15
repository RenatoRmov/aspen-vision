// Regenerates src/lib/demo-seed-data.ts from the current local dev.db.
// Run after reseeding locally, whenever the Vercel demo dataset should be
// refreshed: node scripts/generate-demo-seed.js
const fs = require("node:fs");
const path = require("node:path");

const dbPath = path.join(process.cwd(), "dev.db");
const outPath = path.join(process.cwd(), "src", "lib", "demo-seed-data.ts");

const buffer = fs.readFileSync(dbPath);
const base64 = buffer.toString("base64");

const contents = [
  "// Auto-generated snapshot of the seeded demo SQLite database, base64-encoded.",
  "// Regenerate: node scripts/generate-demo-seed.js (see that file for the one-liner it runs).",
  `export const DEMO_SEED_DB_BASE64 = ${JSON.stringify(base64)};`,
  "",
].join("\n");

fs.writeFileSync(outPath, contents);
console.log(`Wrote ${outPath} (${contents.length} bytes) from ${dbPath} (${buffer.length} bytes).`);
