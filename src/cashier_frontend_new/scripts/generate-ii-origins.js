/**
 * Generates environment-specific .well-known/ii-alternative-origins file.
 * Run before vite build to ensure only the correct origins are deployed per env.
 *
 * Usage: node scripts/generate-ii-origins.js <mode>
 * Modes: local_dev, dev, staging, production
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(
  __dirname,
  "../static/.well-known/ii-alternative-origins",
);

// Per-environment wallet frontend origins
const WALLET_ORIGINS = {
  dev: ["https://qpyyt-4aaaa-aaaam-aifza-cai.icp0.io", "https://dev.cashierapp.io"],
  staging: [],
  production: ["https://cashierapp.io", "https://www.cashierapp.io"],
  local_dev: [],
};

const mode = process.argv[2];
if (!mode) {
  console.error("Usage: node generate-ii-origins.js <mode>");
  process.exit(1);
}

const envOrigins = WALLET_ORIGINS[mode] || [];

const content = JSON.stringify({ alternativeOrigins: envOrigins }, null, 4) + "\n";

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content, "utf-8");
console.log(
  `[ii-origins] Generated for ${mode}: ${envOrigins.length} origins`,
);
