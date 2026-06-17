#!/usr/bin/env node
/**
 * Admin script: get or set the password hashing mode used by the gate canister.
 *
 * Usage:
 *   # Set mode to SHA-256 (default)
 *   node scripts/set-password-hashing-mode.mjs [--network <net>] [--canister-id <id>]
 *
 *   # Print the current mode
 *   node scripts/set-password-hashing-mode.mjs --get [--network <net>] [--canister-id <id>]
 *
 *   # Switch to a specific mode
 *   node scripts/set-password-hashing-mode.mjs --mode sha256|argon2id [--network <net>] [--canister-id <id>]
 *
 * Notes:
 *   - Existing gates are unaffected by a mode switch; each gate's stored hash format
 *     encodes the algorithm used at creation time, so verification always uses the
 *     correct path.
 *   - Only principals with Admin permission on the gate canister can call these endpoints.
 *   - The default mode on a fresh deploy is Argon2id.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

let getMode = false;
let mode = "sha256"; // default
let network = "local";
let canisterId = "gate_service";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--get") getMode = true;
  if (args[i] === "--mode" && args[i + 1]) mode = args[++i].toLowerCase();
  if (args[i] === "--network" && args[i + 1]) network = args[++i];
  if (args[i] === "--canister-id" && args[i + 1]) canisterId = args[++i];
}

const VALID_MODES = ["argon2id", "sha256"];

if (!VALID_MODES.includes(mode)) {
  console.error(`Unknown --mode "${mode}". Use one of: ${VALID_MODES.join(", ")}.`);
  process.exit(1);
}

// Map "production" network alias to dfx's "ic"
const dfxNetwork = network === "production" ? "ic" : network;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Maps CLI mode name → Candid variant name. */
function toCandidVariant(m) {
  return m === "sha256" ? "Sha256" : "Argon2id";
}

/** Maps Candid variant name → CLI mode name. */
function fromCandidVariant(variant) {
  return variant === "Sha256" ? "sha256" : "argon2id";
}

function dfxCall(method, argument, isQuery = false) {
  const dfxArgs = [
    "canister", "call",
    "--network", dfxNetwork,
    "--output", "json",
  ];
  if (isQuery) dfxArgs.push("--query");
  dfxArgs.push(canisterId, method);
  if (argument !== undefined) dfxArgs.push(argument);

  const result = spawnSync("dfx", dfxArgs, { encoding: "utf8", cwd: repoRoot });
  if (result.error) throw new Error(`dfx spawn error: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`dfx ${method} failed (exit ${result.status}):\n${result.stderr}`);
  }
  return result.stdout.trim();
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

// ── Get ───────────────────────────────────────────────────────────────────────

function getCurrentMode() {
  const out = dfxCall("admin_get_password_hashing_algorithm", undefined, true);
  // Output is a Candid variant like: (variant { Argon2id })
  const match = out.match(/variant\s*\{\s*(\w+)\s*\}/);
  if (!match) throw new Error(`Unexpected output from admin_get_password_hashing_algorithm: ${out}`);
  return fromCandidVariant(match[1]);
}

// ── Set ───────────────────────────────────────────────────────────────────────

function setMode(m) {
  const variant = toCandidVariant(m);
  console.log(`Setting password hashing mode to ${variant}…`);
  const out = dfxCall(
    "admin_set_password_hashing_algorithm",
    `(variant { ${variant} })`,
  );
  parseResultUnit(out, "admin_set_password_hashing_algorithm");
  console.log(`Password hashing mode set to ${variant}.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Network:  ${dfxNetwork}`);
  console.log(`Canister: ${canisterId}`);

  if (getMode) {
    const current = getCurrentMode();
    console.log(`Password hashing mode: ${current}`);
    return;
  }

  setMode(mode);
}

try {
  main();
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
}
