#!/usr/bin/env tsx
/**
 * Main code generation script for @cashier/shared
 *
 * Generates TypeScript and Rust code from:
 * 1. JSON Schema (types.schema.json) → Types for both languages
 * 2. TypeScript Logic (logic/fee-calculations.ts) → Transpiled to Rust
 *
 * Usage:
 *   pnpm run generate           # Generate all
 *   pnpm run generate:types     # Generate types only
 *   pnpm run generate:functions # Generate functions only
 */

import * as fs from "fs";
import * as path from "path";
import { generateTypeScript } from "./generators/typescript.js";
import { generateRust } from "./generators/rust.js";
import {
  transpileToRust,
  generateTypeScriptFunctions,
} from "./generators/logic-transpiler.js";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const SCHEMAS_DIR = path.join(ROOT_DIR, "schemas");
const LOGIC_DIR = path.join(ROOT_DIR, "logic");
const TEMPLATES_DIR = path.join(ROOT_DIR, "templates");
const GENERATED_TS_DIR = path.join(ROOT_DIR, "generated", "ts");
const GENERATED_RUST_DIR = path.join(ROOT_DIR, "generated", "rust");

interface GeneratorOptions {
  typesOnly: boolean;
  functionsOnly: boolean;
}

interface FeeTable {
  fees: {
    link_creation: { amount: string };
    gate_create: { amount: string };
    gate_open: { amount: string };
  };
}

function parseArgs(): GeneratorOptions {
  const args = process.argv.slice(2);
  return {
    typesOnly: args.includes("--types-only"),
    functionsOnly: args.includes("--functions-only"),
  };
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadJsonFile<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  ✓ Generated: ${path.relative(ROOT_DIR, filePath)}`);
}

function validateFeeTable(feeTable: FeeTable): void {
  const replacements: Array<[string, string]> = [
    ["getLinkCreationFeeAmount", feeTable.fees.link_creation.amount],
    ["getGateCreateFeeAmount", feeTable.fees.gate_create.amount],
    ["getGateOpenFeeAmount", feeTable.fees.gate_open.amount],
  ];

  for (const [functionName, amount] of replacements) {
    if (!/^\d+$/.test(amount)) {
      throw new Error(`Invalid fee amount for ${functionName}: ${amount}`);
    }
  }
}

function generateTypeScriptFeeTable(feeTable: FeeTable): string {
  validateFeeTable(feeTable);
  return [
    "// AUTO-GENERATED FILE - DO NOT EDIT",
    "// Generated from: templates/fees.json",
    "",
    "export function getLinkCreationFeeTableAmount(): bigint {",
    `  return ${feeTable.fees.link_creation.amount}n;`,
    "}",
    "",
    "export function getGateCreateFeeTableAmount(): bigint {",
    `  return ${feeTable.fees.gate_create.amount}n;`,
    "}",
    "",
    "export function getGateOpenFeeTableAmount(): bigint {",
    `  return ${feeTable.fees.gate_open.amount}n;`,
    "}",
    "",
  ].join("\n");
}

function generateRustFeeTable(feeTable: FeeTable): string {
  validateFeeTable(feeTable);
  return [
    "// AUTO-GENERATED FILE - DO NOT EDIT",
    "// Generated from: templates/fees.json",
    "",
    "#![allow(dead_code)]",
    "",
    "use candid::Nat;",
    "",
    "pub fn get_link_creation_fee_table_amount() -> Nat {",
    `    Nat::from(${feeTable.fees.link_creation.amount}u64)`,
    "}",
    "",
    "pub fn get_gate_create_fee_table_amount() -> Nat {",
    `    Nat::from(${feeTable.fees.gate_create.amount}u64)`,
    "}",
    "",
    "pub fn get_gate_open_fee_table_amount() -> Nat {",
    `    Nat::from(${feeTable.fees.gate_open.amount}u64)`,
    "}",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log("\n🔧 Cashier Shared Package - Code Generation\n");
  console.log("━".repeat(50));

  // Ensure output directories exist
  ensureDir(GENERATED_TS_DIR);
  ensureDir(GENERATED_RUST_DIR);

  // Load schemas
  const typesSchema = loadJsonFile<Record<string, unknown>>(
    path.join(SCHEMAS_DIR, "types.schema.json")
  );
  const feeTable = loadJsonFile<FeeTable>(
    path.join(TEMPLATES_DIR, "fees.json")
  );

  const shouldGenerateTypes = !options.functionsOnly;
  const shouldGenerateFunctions = !options.typesOnly;

  // =========================================================================
  // Generate TypeScript
  // =========================================================================
  console.log("\n📘 Generating TypeScript...\n");

  if (shouldGenerateTypes) {
    const tsTypes = generateTypeScript.types(typesSchema);
    writeFile(path.join(GENERATED_TS_DIR, "types.ts"), tsTypes);
  }

  writeFile(
    path.join(GENERATED_TS_DIR, "fee-table.ts"),
    generateTypeScriptFeeTable(feeTable)
  );

  if (shouldGenerateFunctions) {
    // Use the new transpiler - copy TS logic with proper imports
    const logicSourceFile = path.join(LOGIC_DIR, "fee-calculations.ts");
    const logicSource = fs.readFileSync(logicSourceFile, "utf-8");
    const tsFunctions = generateTypeScriptFunctions(
      logicSourceFile,
      logicSource
    );
    writeFile(path.join(GENERATED_TS_DIR, "functions.ts"), tsFunctions);
  }

  // Generate index file - check file existence to avoid overriding previous generation
  const hasTsTypes = fs.existsSync(path.join(GENERATED_TS_DIR, "types.ts"));
  const hasTsFunctions = fs.existsSync(
    path.join(GENERATED_TS_DIR, "functions.ts")
  );
  const hasTsFeeTable = fs.existsSync(
    path.join(GENERATED_TS_DIR, "fee-table.ts")
  );
  const tsIndex = generateTypeScript.index(
    hasTsTypes,
    hasTsFunctions,
    hasTsFeeTable
  );
  writeFile(path.join(GENERATED_TS_DIR, "index.ts"), tsIndex);

  // =========================================================================
  // Generate Rust
  // =========================================================================
  console.log("\n🦀 Generating Rust...\n");

  if (shouldGenerateTypes) {
    const rustTypes = generateRust.types(typesSchema);
    writeFile(path.join(GENERATED_RUST_DIR, "types.rs"), rustTypes);
  }

  writeFile(
    path.join(GENERATED_RUST_DIR, "fee_table.rs"),
    generateRustFeeTable(feeTable)
  );

  if (shouldGenerateFunctions) {
    // Use the new transpiler - transpile TS logic to Rust
    const logicSourceFile = path.join(LOGIC_DIR, "fee-calculations.ts");
    const logicSource = fs.readFileSync(logicSourceFile, "utf-8");
    const rustFunctions = transpileToRust(logicSourceFile, logicSource);
    writeFile(path.join(GENERATED_RUST_DIR, "functions.rs"), rustFunctions);
  }

  // Generate mod.rs - check file existence to avoid overriding previous generation
  const hasRustTypes = fs.existsSync(path.join(GENERATED_RUST_DIR, "types.rs"));
  const hasRustFunctions = fs.existsSync(
    path.join(GENERATED_RUST_DIR, "functions.rs")
  );
  const hasRustFeeTable = fs.existsSync(
    path.join(GENERATED_RUST_DIR, "fee_table.rs")
  );
  const rustMod = generateRust.mod(
    hasRustTypes,
    hasRustFunctions,
    hasRustFeeTable
  );
  writeFile(path.join(GENERATED_RUST_DIR, "mod.rs"), rustMod);

  console.log("\n━".repeat(50));
  console.log("✅ Code generation complete!\n");
  console.log("📝 To modify fee formulas, edit: logic/fee-calculations.ts");
  console.log("   To modify static fee amounts, edit: templates/fees.json");
  console.log("   Then run: pnpm run generate\n");
}

main().catch((error) => {
  console.error("❌ Generation failed:", error);
  process.exit(1);
});
