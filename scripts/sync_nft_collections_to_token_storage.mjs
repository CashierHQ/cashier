#!/usr/bin/env node
/**
 * Offchain script: aggregate NFT collection metadata from nftGeek and Toniq (Entrepot),
 * then push the merged records into the `token_storage` canister's collection registry via
 * `collection_manager_upsert_collections`.
 *
 * Unlike `sync_omnity_runes_to_token_storage.mjs` (which patches an init/upgrade-args template
 * file for redeploy-time seeding), this script makes a live authenticated update call — it
 * shells out to `dfx canister call` using the caller's ambient `dfx identity`, which must hold
 * `Permission::Admin` or `Permission::CollectionManager` on the target `token_storage` canister.
 *
 * Data sources:
 *   - nftGeek  https://api.nftgeek.app/api/1/collections            (canonical: canisterId, name, standard)
 *   - Toniq    https://us-central1-entrepot-api.cloudfunctions.net/api/collections  (enrich: description, image, royalty)
 *
 * DGDG (https://dgdg.app/nfts/collections) is intentionally NOT used as a source: it's a
 * client-rendered page, not a JSON API (fetching it returns HTML, not data), so `total_items`
 * and `floor_price` have no source for now and default to 0/null. Revisit if DGDG exposes a
 * real JSON endpoint later.
 *
 * Usage:
 *   node scripts/sync_nft_collections_to_token_storage.mjs --dry-run
 *   node scripts/sync_nft_collections_to_token_storage.mjs --network local
 *   node scripts/sync_nft_collections_to_token_storage.mjs --network ic --limit 50
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const NFTGEEK_COLLECTIONS_URL = "https://api.nftgeek.app/api/1/collections";
const TONIQ_COLLECTIONS_URL = "https://us-central1-entrepot-api.cloudfunctions.net/api/collections";

const DEFAULT_NETWORK = "local";
const DEFAULT_CANISTER_ID = "token_storage";
const DEFAULT_BATCH_SIZE = 100;

// ── CLI args ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    network: DEFAULT_NETWORK,
    canisterId: DEFAULT_CANISTER_ID,
    dryRun: false,
    limit: undefined,
    batchSize: DEFAULT_BATCH_SIZE,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--network":
        args.network = requiredValue(argv, ++i, arg);
        break;
      case "--canister-id":
        args.canisterId = requiredValue(argv, ++i, arg);
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--limit":
        args.limit = Number.parseInt(requiredValue(argv, ++i, arg), 10);
        break;
      case "--batch-size":
        args.batchSize = Number.parseInt(requiredValue(argv, ++i, arg), 10);
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: node scripts/sync_nft_collections_to_token_storage.mjs [options]

Options:
  --dry-run             Print merge summary and a sample without calling the canister.
  --network <net>        dfx network to call ("local" is mapped as-is, "production" -> "ic"). Defaults to ${DEFAULT_NETWORK}.
  --canister-id <id>     Target canister name/id. Defaults to ${DEFAULT_CANISTER_ID}.
  --limit <n>            Cap the number of collections processed (useful for local testing).
  --batch-size <n>       Collections per collection_manager_upsert_collections call. Defaults to ${DEFAULT_BATCH_SIZE}.
  -h, --help             Show this help.
`);
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchNftGeekCollections() {
  const data = await fetchJson(NFTGEEK_COLLECTIONS_URL);
  return data.collections ?? [];
}

async function fetchToniqCollections() {
  return fetchJson(TONIQ_COLLECTIONS_URL);
}

// ── Merge ─────────────────────────────────────────────────────────────────────

function buildToniqIndex(toniqCollections) {
  const index = new Map();
  for (const entry of toniqCollections) {
    if (entry?.id) index.set(entry.id, entry);
  }
  return index;
}

/** Parses Toniq's "royalty" field, formatted as "<principal>:<rate>" (rate is a fraction e.g. 0.05). */
function parseToniqRoyalty(royalty) {
  if (typeof royalty !== "string") return null;
  const parts = royalty.split(":");
  if (parts.length !== 2) return null;
  const rate = Number.parseFloat(parts[1]);
  if (Number.isNaN(rate)) return null;
  // Store as a whole-number percentage (e.g. 0.05 -> 5), matching RegistryCollection.royalty: Option<u64>.
  return Math.round(rate * 100);
}

/**
 * Merges the 2 data sources into `RegistryCollection`-shaped plain objects, keyed by nftGeek's
 * `canisterId` (the canonical source of which collections exist and their standard/interface).
 * Toniq only enriches metadata (description/image/royalty) — its own `standard`-like field is
 * unreliable (e.g. "legacy1.5") and is ignored. `total_items`/`floor_price` have no data source
 * currently (DGDG isn't a JSON API) and default to 0/null.
 */
export function mergeCollections(nftGeekCollections, toniqCollections) {
  const toniqIndex = buildToniqIndex(toniqCollections);

  return nftGeekCollections
    .filter((entry) => typeof entry.canisterId === "string" && entry.canisterId.length > 0)
    .map((entry) => {
      const toniq = toniqIndex.get(entry.canisterId);

      const description = toniq?.description ?? "";
      const image = toniq?.avatar || toniq?.collection || "";
      const royalty = toniq ? parseToniqRoyalty(toniq.royalty) : null;

      return {
        collectionId: entry.canisterId,
        name: entry.name ?? entry.alias ?? entry.canisterId,
        description,
        image,
        totalItems: 0n,
        floorPrice: null,
        royalty,
        // Neither source exposes a true creator/controller principal; no Cashier-originated
        // collections exist yet in phase 1 (the Factory is a later phase). Both fields are
        // therefore harmless placeholders.
        creator: entry.canisterId,
        standard: entry.interface ?? "EXT",
        isCashier: false,
      };
    });
}

// ── Candid encoding ───────────────────────────────────────────────────────────

function escapeCandidText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function formatOptionalNat(value, natType) {
  return value === null || value === undefined
    ? `null : opt ${natType}`
    : `opt (${value.toString()} : ${natType})`;
}

function generateCollectionRecord(collection) {
  return `record {
    collection_id = principal "${collection.collectionId}";
    name = "${escapeCandidText(collection.name)}";
    description = "${escapeCandidText(collection.description)}";
    image = "${escapeCandidText(collection.image)}";
    total_items = ${collection.totalItems.toString()} : nat64;
    floor_price = ${formatOptionalNat(collection.floorPrice, "nat")};
    royalty = ${formatOptionalNat(collection.royalty, "nat64")};
    creator = principal "${collection.creator}";
    standard = "${escapeCandidText(collection.standard)}";
    is_cashier = ${collection.isCashier};
  }`;
}

function generateUpsertArgument(collections) {
  const records = collections.map(generateCollectionRecord).join(";\n  ");
  return `(record { collections = vec {\n  ${records}\n} })`;
}

// ── dfx call ──────────────────────────────────────────────────────────────────

function dfxNetworkAlias(network) {
  return network === "production" ? "ic" : network;
}

function callUpsertCollections(network, canisterId, collections) {
  const argument = generateUpsertArgument(collections);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nft-collections-args-"));
  const tmpFile = path.join(tmpDir, "upsert_collections.txt");
  fs.writeFileSync(tmpFile, argument);

  try {
    const result = spawnSync(
      "dfx",
      [
        "canister",
        "call",
        "--network",
        dfxNetworkAlias(network),
        "--output",
        "json",
        "--argument-file",
        tmpFile,
        canisterId,
        "collection_manager_upsert_collections",
      ],
      { cwd: repoRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    );

    if (result.error) throw new Error(`dfx spawn error: ${result.error.message}`);
    if (result.status !== 0) {
      throw new Error(
        `collection_manager_upsert_collections failed (exit ${result.status}):\n${result.stderr}`,
      );
    }

    const parsed = JSON.parse(result.stdout.trim());
    if (parsed && "Err" in parsed) {
      throw new Error(`collection_manager_upsert_collections failed: ${JSON.stringify(parsed.Err)}`);
    }
    return parsed?.Ok?.upserted;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.error("Fetching nftGeek collections…");
  const nftGeekCollections = await fetchNftGeekCollections();
  console.error("Fetching Toniq collections…");
  const toniqCollections = await fetchToniqCollections();

  let merged = mergeCollections(nftGeekCollections, toniqCollections);
  if (Number.isInteger(args.limit)) {
    merged = merged.slice(0, args.limit);
  }

  const batches = chunk(merged, args.batchSize);

  console.log(
    `NFT collection sync summary: nftGeek=${nftGeekCollections.length}, toniq=${toniqCollections.length}, merged=${merged.length}, batches=${batches.length}`,
  );

  if (args.dryRun) {
    console.log("Sample (first 5):");
    console.log(
      JSON.stringify(
        merged.slice(0, 5),
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
        2,
      ),
    );
    return;
  }

  let totalUpserted = 0;
  for (const [index, batch] of batches.entries()) {
    console.error(`Upserting batch ${index + 1}/${batches.length} (${batch.length} collections)…`);
    const upserted = callUpsertCollections(args.network, args.canisterId, batch);
    totalUpserted += upserted ?? batch.length;
  }

  console.log(`Upserted ${totalUpserted} collections into ${args.canisterId} on ${args.network}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
