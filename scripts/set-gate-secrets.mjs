#!/usr/bin/env node
/**
 * Admin script: upload Gate canister secrets from scripts/.env.
 *
 * Supports two storage modes:
 *   plaintext (default) — calls admin_plain_secret_set directly, no crypto needed.
 *   vetkd               — encrypts each secret client-side with the canister's vetKD
 *                         public key, then calls admin_secret_set.
 *
 * Usage:
 *   # Upload all secrets in plaintext mode (default)
 *   node scripts/set-gate-secret.mjs [--network <net>] [--canister-id <id>]
 *
 *   # Upload all secrets in vetkd mode
 *   node scripts/set-gate-secret.mjs --mode vetkd [--network <net>] [--canister-id <id>]
 *
 *   # Switch the canister's active storage mode only (no upload)
 *   node scripts/set-gate-secret.mjs --set-canister-mode vetkd|plaintext [--network <net>] [--canister-id <id>]
 *
 * scripts/.env format:
 *   TWITTER_API_KEY=mykey123
 *   X_OAUTH_BASIC_AUTH=base64(client_id:client_secret)   ← raw base64 only, no "Basic " prefix
 *   X_REDIRECT_URI=https://cashierapp.io/auth
 *   BREVO_API_KEY=xkeysib-...                            ← Brevo API key (required for OTP gates)
 *   BREVO_EMAIL_SENDER=noreply@cashierapp.io             ← From-address for OTP emails
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// ── Env var → canister secret key mapping ────────────────────────────────────

const SECRET_MAP = {
  TWITTER_API_KEY: "twitter_api_key",
  X_OAUTH_BASIC_AUTH: "x_oauth_basic_auth",
  X_REDIRECT_URI: "x_redirect_uri",
  X_BEARER_TOKEN: "x_bearer_token",
  BREVO_API_KEY: "brevo_api_key",
  BREVO_EMAIL_SENDER: "brevo_email_sender",
};

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

let mode = "plaintext"; // default
let setCanisterMode = null;
let network = "local";
let canisterId = "gate_service";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mode" && args[i + 1]) mode = args[++i];
  if (args[i] === "--set-canister-mode" && args[i + 1]) setCanisterMode = args[++i];
  if (args[i] === "--network" && args[i + 1]) network = args[++i];
  if (args[i] === "--canister-id" && args[i + 1]) canisterId = args[++i];
}

if (mode !== "plaintext" && mode !== "vetkd") {
  console.error(`Unknown --mode "${mode}". Use "plaintext" or "vetkd".`);
  process.exit(1);
}
if (setCanisterMode && setCanisterMode !== "plaintext" && setCanisterMode !== "vetkd") {
  console.error(`Unknown --set-canister-mode "${setCanisterMode}". Use "plaintext" or "vetkd".`);
  process.exit(1);
}

// Map "production" network alias to dfx's "ic"
const dfxNetwork = network === "production" ? "ic" : network;

// ── vetKD constants (must match gate_service/src/utils/vetkd.rs) ──────────────

const VETKEY_INPUT = new TextEncoder().encode("cashier-gate-secrets");

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error(`scripts/.env not found at ${envPath}`);
    console.error("Create it with the following keys:");
    for (const k of Object.keys(SECRET_MAP)) console.error(`  ${k}=<value>`);
    process.exit(1);
  }

  const entries = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    entries[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return entries;
}

function toBlobLiteral(bytes) {
  const escaped = Array.from(bytes)
    .map((b) => `\\${b.toString(16).padStart(2, "0")}`)
    .join("");
  return `blob "${escaped}"`;
}

function parseResultBlob(jsonStr, callName) {
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`${callName}: failed to parse JSON:\n${jsonStr}`);
  }
  if ("Err" in parsed) throw new Error(`${callName} error: ${JSON.stringify(parsed.Err)}`);
  if (!("Ok" in parsed)) throw new Error(`${callName}: unexpected output: ${jsonStr}`);
  return new Uint8Array(parsed.Ok);
}

function parseResultUnit(jsonStr, callName) {
  if (!jsonStr || jsonStr === "()" || jsonStr === "null") return;
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return; // non-JSON Ok unit — treat as success
  }
  if (parsed && "Err" in parsed) {
    throw new Error(`${callName} failed: ${JSON.stringify(parsed.Err)}`);
  }
}

function dfxCall(canister, method, argument) {
  const dfxArgs = [
    "canister", "call",
    "--network", dfxNetwork,
    "--output", "json",
    canister, method,
  ];
  if (argument !== undefined) dfxArgs.push(argument);

  const result = spawnSync("dfx", dfxArgs, { encoding: "utf8", cwd: repoRoot });
  if (result.error) throw new Error(`dfx spawn error: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`dfx ${method} failed (exit ${result.status}):\n${result.stderr}`);
  }
  return result.stdout.trim();
}

// ── Mode switch only ──────────────────────────────────────────────────────────

function switchCanisterMode(targetMode) {
  const variant = targetMode === "vetkd" ? "VetKey" : "PlainText";
  console.log(`Switching canister storage mode to ${variant}…`);
  const out = dfxCall(canisterId, "admin_set_secret_storage_mode", `(variant { ${variant} })`);
  parseResultUnit(out, "admin_set_secret_storage_mode");
  console.log(`Canister storage mode set to ${variant}.`);
}

// ── Plain-text upload ─────────────────────────────────────────────────────────

function uploadPlaintext(secretKey, secretValue) {
  const out = dfxCall(
    canisterId,
    "admin_plain_secret_set",
    `("${secretKey}", "${secretValue.replace(/"/g, '\\"')}")`,
  );
  parseResultUnit(out, "admin_plain_secret_set");
}

// ── vetKD upload ──────────────────────────────────────────────────────────────

async function uploadVetkd(secretKey, secretValue, vetkd) {
  // 1. Generate ephemeral transport keypair
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const tsk = new vetkd.TransportSecretKey(seed);
  const transportPk = tsk.public_key();

  // 2. Fetch canister's vetKD derived public key
  const pkJson = dfxCall(canisterId, "admin_vetkd_public_key", "()");
  const derivedPublicKeyBytes = parseResultBlob(pkJson, "admin_vetkd_public_key");

  // 3. Derive encrypted VetKey
  const ekJson = dfxCall(
    canisterId,
    "admin_derive_vetkey",
    `(${toBlobLiteral(transportPk)})`,
  );
  const encryptedKeyBytes = parseResultBlob(ekJson, "admin_derive_vetkey");

  // 4. Decrypt to raw VetKey bytes
  const vetkeyBytes = tsk.decrypt(encryptedKeyBytes, derivedPublicKeyBytes, VETKEY_INPUT);

  // 5. Derive AES key via HKDF-SHA256 (matches ic-vetkeys::VetKey::derive_symmetric_key)
  const aesKey = crypto.hkdfSync(
    "sha256",
    vetkeyBytes,
    Buffer.alloc(32, 0),
    Buffer.from("cashier-api-secrets-v1"),
    32,
  );

  // 6. AES-256-GCM encrypt: nonce (12 bytes) || ciphertext+tag
  const plaintextBytes = new TextEncoder().encode(secretValue);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey("raw", aesKey, "AES-GCM", false, ["encrypt"]);
  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    cryptoKey,
    plaintextBytes,
  );
  const ciphertext = new Uint8Array(nonce.length + ciphertextWithTag.byteLength);
  ciphertext.set(nonce, 0);
  ciphertext.set(new Uint8Array(ciphertextWithTag), nonce.length);

  // 7. Store encrypted blob
  const setJson = dfxCall(
    canisterId,
    "admin_secret_set",
    `("${secretKey}", ${toBlobLiteral(ciphertext)})`,
  );
  parseResultUnit(setJson, "admin_secret_set");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Network:  ${dfxNetwork}`);
  console.log(`Canister: ${canisterId}`);

  // Handle --set-canister-mode only
  if (setCanisterMode) {
    switchCanisterMode(setCanisterMode);
    return;
  }

  const env = loadEnv();
  console.log(`Mode:     ${mode}`);

  let vetkd = null;
  if (mode === "vetkd") {
    try {
      const wasmJsPath = path.join(
        repoRoot,
        "src/cashier_frontend_new/node_modules/ic-vetkd-utils/ic_vetkd_utils.js",
      );
      const wasmPath = path.join(
        repoRoot,
        "src/cashier_frontend_new/node_modules/ic-vetkd-utils/ic_vetkd_utils_bg.wasm",
      );
      vetkd = await import(wasmJsPath);
      const wasmBytes = fs.readFileSync(wasmPath);
      vetkd.initSync(wasmBytes);
    } catch {
      console.error("Failed to load ic-vetkd-utils. Run:");
      console.error("  cd src/cashier_frontend_new && pnpm add ic-vetkd-utils@0.3.0");
      process.exit(1);
    }
  }

  let uploaded = 0;
  for (const [envVar, canisterKey] of Object.entries(SECRET_MAP)) {
    const value = env[envVar];
    if (!value) {
      console.warn(`  SKIP  ${envVar} (not set in scripts/.env)`);
      continue;
    }

    process.stdout.write(`  SET   ${canisterKey} … `);
    if (mode === "plaintext") {
      uploadPlaintext(canisterKey, value);
    } else {
      await uploadVetkd(canisterKey, value, vetkd);
    }
    console.log("ok");
    uploaded++;
  }

  console.log(`\nDone. ${uploaded}/${Object.keys(SECRET_MAP).length} secrets uploaded to "${dfxNetwork}" in ${mode} mode.`);

  switchCanisterMode(mode);

  // Delete secrets from the other store so stale values don't linger
  const otherDeleteMethod =
    mode === "plaintext" ? "admin_secret_delete" : "admin_plain_secret_delete";
  console.log(`Deleting secrets from ${mode === "plaintext" ? "vetkd" : "plain-text"} store…`);
  for (const canisterKey of Object.values(SECRET_MAP)) {
    const out = dfxCall(canisterId, otherDeleteMethod, `("${canisterKey}")`);
    parseResultUnit(out, otherDeleteMethod);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
