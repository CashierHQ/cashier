/**
 * TypeScript to Rust Transpiler using AST (ts-morph)
 *
 * This transpiler converts TypeScript fee calculation functions to Rust
 * by parsing the TypeScript AST and generating equivalent Rust code.
 *
 * Supports:
 * - Function declarations with typed parameters
 * - Switch statements → match expressions
 * - BigInt literals and operations → Nat
 * - Ternary operators → if/else expressions
 * - Enum member access
 */

import * as fs from 'fs';
import {
	Project,
	SyntaxKind,
	Node,
	FunctionDeclaration,
	ParameterDeclaration,
	SwitchStatement,
	CaseClause,
	DefaultClause,
	ReturnStatement,
	BinaryExpression,
	ConditionalExpression,
	PropertyAccessExpression,
	Identifier,
	BigIntLiteral,
	VariableStatement,
	Block,
	CallExpression,
} from 'ts-morph';

// Convert camelCase to snake_case
function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '');
}

// Type mappings
const TYPE_MAP: Record<string, string> = {
	bigint: 'Nat',
	IntentParticipants: 'IntentParticipants',
	TokenStandard: 'TokenStandard',
	number: 'u64',
};

// Convert TypeScript type to Rust type
function convertType(tsType: string): string {
	// Handle import("...").TypeName format from ts-morph
	const importMatch = tsType.match(/import\([^)]+\)\.(\w+)/);
	if (importMatch) {
		return TYPE_MAP[importMatch[1]] || importMatch[1];
	}
	return TYPE_MAP[tsType] || tsType;
}

// Convert a parameter to Rust format
function convertParameter(param: ParameterDeclaration): string {
	const name = toSnakeCase(param.getName());
	const tsType = param.getType().getText();
	const rustType = convertType(tsType);

	// Use references for complex types
	if (
		rustType === 'Nat' ||
		rustType === 'IntentParticipants' ||
		rustType === 'TokenStandard'
	) {
		return `${name}: &${rustType}`;
	}
	return `${name}: ${rustType}`;
}

// Convert JSDoc to Rust doc comments
function convertJsDoc(func: FunctionDeclaration): string {
	const jsDocs = func.getJsDocs();
	if (jsDocs.length === 0) return '';

	const lines: string[] = [];
	for (const jsDoc of jsDocs) {
		const comment = jsDoc.getComment();
		if (typeof comment === 'string') {
			for (const line of comment.split('\n')) {
				lines.push(`/// ${line.trim()}`);
			}
		}
	}
	return lines.join('\n');
}

// Convert an expression node to Rust
function convertExpression(node: Node): string {
	const kind = node.getKind();

	switch (kind) {
		case SyntaxKind.BigIntLiteral: {
			const literal = node as BigIntLiteral;
			const value = String(literal.getLiteralValue());
			return `Nat::from(${value}u64)`;
		}

		case SyntaxKind.Identifier: {
			const id = node as Identifier;
			return toSnakeCase(id.getText());
		}

		case SyntaxKind.PropertyAccessExpression: {
			const propAccess = node as PropertyAccessExpression;
			const obj = propAccess.getExpression().getText();
			const prop = propAccess.getName();
			// Convert Enum.Value to Enum::Value
			if (obj === 'IntentParticipants' || obj === 'TokenStandard') {
				return `${obj}::${prop}`;
			}
			return `${toSnakeCase(obj)}.${toSnakeCase(prop)}`;
		}

		case SyntaxKind.CallExpression: {
			const call = node as CallExpression;
			const expr = call.getExpression();
			const funcName = expr.getText();

			// Handle BigInt() specially - convert to Nat::from()
			if (funcName === 'BigInt') {
				const args = call.getArguments();
				if (args.length === 1) {
					const arg = convertExpression(args[0]);
					// If the argument is already a Nat identifier, just use it
					// Otherwise, wrap in Nat::from() with proper casting
					return `Nat::from(${arg})`;
				}
			}

			// Handle regular function calls - convert to snake_case
			const rustFuncName = toSnakeCase(funcName);
			const args = call
				.getArguments()
				.map((arg) => convertExpression(arg))
				.join(', ');
			return `${rustFuncName}(${args})`;
		}

		case SyntaxKind.TypeOfExpression: {
			// TypeOf is TypeScript-specific and should not be transpiled
			throw new Error(
				`typeof operator detected in function '${node.getSourceFile().getBaseName()}' - ` +
					`this function uses TypeScript-specific features and should not be transpiled to Rust`,
			);
		}

		case SyntaxKind.BinaryExpression: {
			const binary = node as BinaryExpression;
			const left = convertExpression(binary.getLeft());
			const right = convertExpression(binary.getRight());
			const op = binary.getOperatorToken().getText();

			switch (op) {
				case '??':
					// Nullish coalescing is TypeScript-specific
					throw new Error(
						`Nullish coalescing operator (??) detected - ` +
							`this function uses TypeScript-specific features and should not be transpiled to Rust`,
					);
				case '===':
				case '==':
					// For enum comparisons, dereference the left side
					const leftText = binary.getLeft().getText();
					if (
						leftText.includes('participants') ||
						leftText.includes('tokenStandard')
					) {
						return `*${left} == ${right}`;
					}
					return `${left} == ${right}`;
				case '*':
					// For Nat multiplication, clone if needed
					const leftNeedsClone = !left.startsWith('Nat::');
					const rightNeedsClone = !right.startsWith('Nat::');
					return `${leftNeedsClone ? left + '.clone()' : left} * ${rightNeedsClone ? right + '.clone()' : right}`;
				case '+':
					// For Nat addition, clone if needed
					const leftNeedsCloneAdd =
						!left.startsWith('Nat::') && !left.includes('.clone()');
					const rightNeedsCloneAdd =
						!right.startsWith('Nat::') && !right.includes('.clone()');
					return `${leftNeedsCloneAdd ? left + '.clone()' : left} + ${rightNeedsCloneAdd ? right + '.clone()' : right}`;
				default:
					return `${left} ${op} ${right}`;
			}
		}

		case SyntaxKind.ConditionalExpression: {
			// Ternary operator: a ? b : c → if a { b } else { c }
			const cond = node as ConditionalExpression;
			const condition = convertExpression(cond.getCondition());
			const whenTrue = convertExpression(cond.getWhenTrue());
			const whenFalse = convertExpression(cond.getWhenFalse());
			return `if ${condition} { ${whenTrue} } else { ${whenFalse} }`;
		}

		case SyntaxKind.ParenthesizedExpression: {
			const inner = node.getChildAtIndex(1);
			return `(${convertExpression(inner)})`;
		}

		default:
			// Fallback: just convert the text with basic transformations
			let text = node.getText();
			text = text.replace(/(\d+)n\b/g, 'Nat::from($1u64)');
			text = text.replace(
				/IntentParticipants\.(\w+)/g,
				'IntentParticipants::$1',
			);
			text = text.replace(/TokenStandard\.(\w+)/g, 'TokenStandard::$1');
			return text;
	}
}

// Convert a return statement to Rust
function convertReturnStatement(
	stmt: ReturnStatement,
	indent: string,
	borrowedParams: Set<string> = new Set(),
): string {
	const expr = stmt.getExpression();
	if (!expr) return `${indent}return;`;

	let convertedExpr = convertExpression(expr);

	// If returning a borrowed parameter directly, add .clone()
	// Check if the expression is a simple identifier that's a borrowed param
	if (expr.getKind() === SyntaxKind.Identifier) {
		const identifierName = toSnakeCase(expr.getText());
		if (
			borrowedParams.has(identifierName) &&
			!convertedExpr.includes('.clone()')
		) {
			convertedExpr = `${convertedExpr}.clone()`;
		}
	}

	return `${indent}${convertedExpr}`;
}

// Convert a variable statement to Rust
function convertVariableStatement(
	stmt: VariableStatement,
	indent: string,
): string {
	const decl = stmt.getDeclarations()[0];
	const name = toSnakeCase(decl.getName());
	const init = decl.getInitializer();
	if (!init) return `${indent}let ${name};`;
	return `${indent}let ${name} = ${convertExpression(init)};`;
}

// Convert a switch statement to Rust match
function convertSwitchStatement(
	stmt: SwitchStatement,
	indent: string,
	borrowedParams: Set<string> = new Set(),
): string {
	const expr = stmt.getExpression();
	const exprText = toSnakeCase(expr.getText());

	const lines: string[] = [];
	lines.push(`${indent}match ${exprText} {`);

	for (const clause of stmt.getClauses()) {
		if (clause.getKind() === SyntaxKind.CaseClause) {
			const caseClause = clause as CaseClause;
			const caseExpr = caseClause.getExpression();
			const pattern = convertExpression(caseExpr);

			lines.push(`${indent}    ${pattern} => {`);

			// Process statements in the case
			const statements = caseClause.getStatements();
			for (const caseStmt of statements) {
				if (caseStmt.getKind() === SyntaxKind.ReturnStatement) {
					lines.push(
						convertReturnStatement(
							caseStmt as ReturnStatement,
							indent + '        ',
							borrowedParams,
						),
					);
				} else if (caseStmt.getKind() !== SyntaxKind.BreakStatement) {
					// Skip break statements, handle other statements
					const stmtText = caseStmt.getText();
					if (stmtText.startsWith('//')) {
						lines.push(`${indent}        ${stmtText}`);
					}
				}
			}

			lines.push(`${indent}    }`);
		} else if (clause.getKind() === SyntaxKind.DefaultClause) {
			const defaultClause = clause as DefaultClause;
			lines.push(`${indent}    _ => {`);

			const statements = defaultClause.getStatements();
			for (const defStmt of statements) {
				if (defStmt.getKind() === SyntaxKind.ReturnStatement) {
					lines.push(
						convertReturnStatement(
							defStmt as ReturnStatement,
							indent + '        ',
							borrowedParams,
						),
					);
				}
			}

			lines.push(`${indent}    }`);
		}
	}

	lines.push(`${indent}}`);
	return lines.join('\n');
}

// Convert a block (function body) to Rust
function convertBlock(
	block: Block,
	indent: string,
	borrowedParams: Set<string> = new Set(),
): string {
	const lines: string[] = [];

	for (const stmt of block.getStatements()) {
		const kind = stmt.getKind();

		switch (kind) {
			case SyntaxKind.VariableStatement:
				lines.push(convertVariableStatement(stmt as VariableStatement, indent));
				break;
			case SyntaxKind.SwitchStatement:
				lines.push(
					convertSwitchStatement(
						stmt as SwitchStatement,
						indent,
						borrowedParams,
					),
				);
				break;
			case SyntaxKind.ReturnStatement:
				lines.push(
					convertReturnStatement(
						stmt as ReturnStatement,
						indent,
						borrowedParams,
					),
				);
				break;
			default:
				// Handle comments and other statements
				const text = stmt.getText().trim();
				if (text.startsWith('//')) {
					lines.push(`${indent}${text}`);
				}
		}
	}

	return lines.join('\n');
}

// Convert a function declaration to Rust
function convertFunction(func: FunctionDeclaration): string {
	const name = toSnakeCase(func.getName() || 'unknown');
	const params = func.getParameters().map(convertParameter).join(', ');
	const returnType = convertType(func.getReturnType().getText());

	// Collect borrowed parameters (those that will have & in Rust)
	const borrowedParams = new Set<string>();
	for (const param of func.getParameters()) {
		const paramName = toSnakeCase(param.getName());
		const tsType = param.getType().getText();
		const rustType = convertType(tsType);

		// Parameters that become references in Rust
		if (
			rustType === 'Nat' ||
			rustType === 'IntentParticipants' ||
			rustType === 'TokenStandard'
		) {
			borrowedParams.add(paramName);
		}
	}

	const lines: string[] = [];

	// Add doc comment
	const docComment = convertJsDoc(func);
	if (docComment) {
		lines.push(docComment);
	}

	// Function signature
	lines.push(`pub fn ${name}(${params}) -> ${returnType} {`);

	// Function body
	const body = func.getBody();
	if (body && body.getKind() === SyntaxKind.Block) {
		lines.push(convertBlock(body as Block, '    ', borrowedParams));
	}

	lines.push('}');

	return lines.join('\n');
}

// Main transpile function
export function transpileToRust(sourceFile: string): string {
	const project = new Project({
		compilerOptions: {
			target: 99, // ESNext
		},
	});

	const source = project.addSourceFileAtPath(sourceFile);

	// Filter out TypeScript-only functions
	// These functions use TypeScript-specific features (typeof, ??, union types)
	// that don't have direct Rust equivalents
	const TYPESCRIPT_ONLY_FUNCTIONS = ['calculateIntentFees', 'calculateMaxAssetAmount'];

	const functions = source
		.getFunctions()
		.filter((f) => f.isExported())
		.filter((f) => {
			const name = f.getName();
			if (TYPESCRIPT_ONLY_FUNCTIONS.includes(name || '')) {
				console.log(`  ⓘ Skipping TypeScript-only function: ${name}`);
				return false;
			}
			return true;
		});

	const lines: string[] = [
		'// AUTO-GENERATED FILE - DO NOT EDIT',
		'// Transpiled from: logic/fee-calculations.ts',
		'// To modify fee logic, edit the TypeScript source and regenerate.',
		'',
		'// Note: Some TypeScript-only functions (e.g., calculateIntentFees) are not',
		'// transpiled because they use TypeScript-specific features like typeof,',
		'// nullish coalescing (??), and union types.',
		'',
		'#![allow(dead_code)]',
		'',
		'use candid::Nat;',
		'use crate::types::{IntentParticipants, TokenStandard};',
		'',
	];

	for (const func of functions) {
		try {
			lines.push(convertFunction(func));
			lines.push('');
		} catch (error) {
			// If we encounter TypeScript-specific features during transpilation,
			// log a warning and skip the function
			if (
				error instanceof Error &&
				error.message.includes('TypeScript-specific')
			) {
				console.log(
					`  ⚠ Skipping function due to TypeScript-specific features: ${func.getName()}`,
				);
				console.log(`    ${error.message}`);
			} else {
				throw error;
			}
		}
	}

	return lines.join('\n');
}

// Generate TypeScript functions file (copy with proper imports)
export function generateTypeScriptFunctions(sourceFile: string): string {
	const source = fs.readFileSync(sourceFile, 'utf-8');

	// Replace the import path
	let output = source.replace(
		/import \{ .* \} from '\.\.\/generated\/ts\/types\.js';/,
		"import { IntentParticipants, TokenStandard } from './types.js';",
	);

	// Remove the @ts-ignore comment
	output = output.replace(/\/\/ @ts-ignore.*\n/g, '');

	// Add header
	const header = [
		'// AUTO-GENERATED FILE - DO NOT EDIT',
		'// Source: logic/fee-calculations.ts',
		'// To modify fee logic, edit the TypeScript source and regenerate.',
		'',
	].join('\n');

	// Find the first comment block and insert header before it
	output = header + output.replace(/^\/\*\*/, '/**');

	return output;
}
