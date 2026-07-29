#!/usr/bin/env node
/**
 * Admin script: get or set the shared rate limit configuration used by
 * `user_open_link_gate` and `user_send_otp` on the cashier_backend canister.
 *
 * Usage:
 *   # Print the current config
 *   node scripts/set-rate-limit.mjs --get [--network <net>] [--canister-id <id>]
 *
 *   # Update one or more fields (unspecified fields keep their current value)
 *   node scripts/set-rate-limit.mjs [--enabled true|false] [--max-requests <n>] [--window-secs <n>] [--network <net>] [--canister-id <id>]
 *
 *   # Clear a specific user's rate limit state on both endpoints
 *   node scripts/set-rate-limit.mjs --reset-user <principal> [--network <net>] [--canister-id <id>]
 *
 * Notes:
 *   - user_open_link_gate and user_send_otp share this one config, but each endpoint
 *     tracks its own independent counter — resetting or updating here affects both.
 *   - Only principals with Admin permission on the cashier_backend canister can call these endpoints.
 *   - Default config on a fresh deploy is enabled=true, max_requests=1, window_secs=60.
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
let resetUserPrincipal = null;
let enabledFlag = null;
let maxRequestsFlag = null;
let windowSecsFlag = null;
let network = "local";
let canisterId = "cashier_backend";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--get") getMode = true;
  if (args[i] === "--reset-user" && args[i + 1]) resetUserPrincipal = args[++i];
  if (args[i] === "--enabled" && args[i + 1]) enabledFlag = args[++i].toLowerCase() === "true";
  if (args[i] === "--max-requests" && args[i + 1]) maxRequestsFlag = parseInt(args[++i], 10);
  if (args[i] === "--window-secs" && args[i + 1]) windowSecsFlag = parseInt(args[++i], 10);
  if (args[i] === "--network" && args[i + 1]) network = args[++i];
  if (args[i] === "--canister-id" && args[i + 1]) canisterId = args[++i];
}

if (maxRequestsFlag !== null && (!Number.isInteger(maxRequestsFlag) || maxRequestsFlag < 0)) {
  console.error(`Invalid --max-requests "${maxRequestsFlag}". Must be a non-negative integer.`);
  process.exit(1);
}
if (windowSecsFlag !== null && (!Number.isInteger(windowSecsFlag) || windowSecsFlag < 0)) {
  console.error(`Invalid --window-secs "${windowSecsFlag}". Must be a non-negative integer.`);
  process.exit(1);
}

// Map "production" network alias to dfx's "ic"
const dfxNetwork = network === "production" ? "ic" : network;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getCurrentConfig() {
  const out = dfxCall("admin_rate_limit_get", undefined, true);
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    throw new Error(`Unexpected output from admin_rate_limit_get: ${out}`);
  }
  return parsed;
}

// ── Set ───────────────────────────────────────────────────────────────────────

function setConfig(config) {
  const arg = `(record { enabled = ${config.enabled}; max_requests = ${config.max_requests} : nat32; window_secs = ${config.window_secs} : nat64 })`;
  console.log(
    `Updating rate limit config to: enabled=${config.enabled}, max_requests=${config.max_requests}, window_secs=${config.window_secs}…`,
  );
  const out = dfxCall("admin_rate_limit_update", arg);
  parseResultUnit(out, "admin_rate_limit_update");
  console.log("Rate limit config updated.");
}

// ── Reset ─────────────────────────────────────────────────────────────────────

function resetUser(principal) {
  console.log(`Resetting rate limit state for ${principal}…`);
  const out = dfxCall("admin_rate_limit_reset_user", `(principal "${principal}")`);
  parseResultUnit(out, "admin_rate_limit_reset_user");
  console.log(`Rate limit state reset for ${principal} on both endpoints.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Network:  ${dfxNetwork}`);
  console.log(`Canister: ${canisterId}`);

  if (resetUserPrincipal) {
    resetUser(resetUserPrincipal);
    return;
  }

  if (getMode) {
    const current = getCurrentConfig();
    console.log(
      `Rate limit config: enabled=${current.enabled}, max_requests=${current.max_requests}, window_secs=${current.window_secs}`,
    );
    return;
  }

  const current = getCurrentConfig();
  const next = {
    enabled: enabledFlag ?? current.enabled,
    max_requests: maxRequestsFlag ?? current.max_requests,
    window_secs: windowSecsFlag ?? current.window_secs,
  };
  setConfig(next);
}

try {
  main();
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
}
