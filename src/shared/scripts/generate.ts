#!/usr/bin/env tsx
/**
 * Main code generation script for @cashier/shared
 *
 * Generates TypeScript and Rust code from:
 * 1. JSON Schema (types.schema.json) → Types for both languages
 * 2. TypeScript Logic (logic/fee-calculations.ts) → Transpiled to Rust
 *
 * Usage:
 *   npm run generate           # Generate all
 *   npm run generate:types     # Generate types only
 *   npm run generate:functions # Generate functions only
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateTypeScript } from './generators/typescript.js';
import { generateRust } from './generators/rust.js';
import {
	transpileToRust,
	generateTypeScriptFunctions,
} from './generators/logic-transpiler.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const SCHEMAS_DIR = path.join(ROOT_DIR, 'schemas');
const LOGIC_DIR = path.join(ROOT_DIR, 'logic');
const GENERATED_TS_DIR = path.join(ROOT_DIR, 'generated', 'ts');
const GENERATED_RUST_DIR = path.join(ROOT_DIR, 'generated', 'rust');

interface GeneratorOptions {
	typesOnly: boolean;
	functionsOnly: boolean;
}

function parseArgs(): GeneratorOptions {
	const args = process.argv.slice(2);
	return {
		typesOnly: args.includes('--types-only'),
		functionsOnly: args.includes('--functions-only'),
	};
}

function ensureDir(dir: string): void {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

function loadJsonFile<T>(filePath: string): T {
	const content = fs.readFileSync(filePath, 'utf-8');
	return JSON.parse(content) as T;
}

function writeFile(filePath: string, content: string): void {
	const dir = path.dirname(filePath);
	ensureDir(dir);
	fs.writeFileSync(filePath, content, 'utf-8');
	console.log(`  ✓ Generated: ${path.relative(ROOT_DIR, filePath)}`);
}

async function main(): Promise<void> {
	const options = parseArgs();

	console.log('\n🔧 Cashier Shared Package - Code Generation\n');
	console.log('━'.repeat(50));

	// Ensure output directories exist
	ensureDir(GENERATED_TS_DIR);
	ensureDir(GENERATED_RUST_DIR);

	// Load schemas
	const typesSchema = loadJsonFile<Record<string, unknown>>(
		path.join(SCHEMAS_DIR, 'types.schema.json'),
	);

	const shouldGenerateTypes = !options.functionsOnly;
	const shouldGenerateFunctions = !options.typesOnly;

	// =========================================================================
	// Generate TypeScript
	// =========================================================================
	console.log('\n📘 Generating TypeScript...\n');

	if (shouldGenerateTypes) {
		const tsTypes = generateTypeScript.types(typesSchema);
		writeFile(path.join(GENERATED_TS_DIR, 'types.ts'), tsTypes);
	}

	if (shouldGenerateFunctions) {
		// Use the new transpiler - copy TS logic with proper imports
		const logicSourceFile = path.join(LOGIC_DIR, 'fee-calculations.ts');
		const tsFunctions = generateTypeScriptFunctions(logicSourceFile);
		writeFile(path.join(GENERATED_TS_DIR, 'functions.ts'), tsFunctions);
	}

	// Generate index file
	const tsIndex = generateTypeScript.index(
		shouldGenerateTypes,
		shouldGenerateFunctions,
	);
	writeFile(path.join(GENERATED_TS_DIR, 'index.ts'), tsIndex);

	// =========================================================================
	// Generate Rust
	// =========================================================================
	console.log('\n🦀 Generating Rust...\n');

	if (shouldGenerateTypes) {
		const rustTypes = generateRust.types(typesSchema);
		writeFile(path.join(GENERATED_RUST_DIR, 'types.rs'), rustTypes);
	}

	if (shouldGenerateFunctions) {
		// Use the new transpiler - transpile TS logic to Rust
		const logicSourceFile = path.join(LOGIC_DIR, 'fee-calculations.ts');
		const rustFunctions = transpileToRust(logicSourceFile);
		writeFile(path.join(GENERATED_RUST_DIR, 'functions.rs'), rustFunctions);
	}

	// Generate mod.rs
	const rustMod = generateRust.mod(
		shouldGenerateTypes,
		shouldGenerateFunctions,
	);
	writeFile(path.join(GENERATED_RUST_DIR, 'mod.rs'), rustMod);

	console.log('\n━'.repeat(50));
	console.log('✅ Code generation complete!\n');
	console.log('📝 To modify fee logic, edit: logic/fee-calculations.ts');
	console.log('   Then run: npm run generate\n');
}

main().catch((error) => {
	console.error('❌ Generation failed:', error);
	process.exit(1);
});
