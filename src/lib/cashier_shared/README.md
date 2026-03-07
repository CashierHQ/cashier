# @cashier/shared

Shared types, configurations, and utility functions for Cashier Protocol.

This package generates **TypeScript** and **Rust** code from a single source of truth (JSON schemas and configs), ensuring type safety and consistency across the frontend and backend.

## Features

- **Single Source of Truth**: Define types once in JSON Schema, generate for both languages
- **ICP Type Support**: Handles `Principal` and `Nat` types correctly in both TypeScript and Rust
- **Fee Calculation Logic**: Shared intent fee calculation functions
- **Type Safety**: Generated code includes full type definitions with `CandidType` derives for Rust

## Structure

```
src/shared/
├── schemas/
│   └── types.schema.json          # Type definitions (JSON Schema)
├── logic/
│   └── fee-calculations.ts        # Fee logic (SINGLE SOURCE OF TRUTH)
├── scripts/
│   ├── generate.ts                # Main generator
│   └── generators/
│       ├── typescript.ts          # TypeScript type generator
│       ├── rust.ts                # Rust type generator
│       └── logic-transpiler.ts    # TS → Rust transpiler (AST-based)
├── generated/
│   ├── ts/                        # Generated TypeScript
│   │   ├── types.ts
│   │   ├── functions.ts
│   │   └── index.ts
│   └── rust/                      # Generated Rust
│       ├── types.rs
│       ├── functions.rs
│       └── mod.rs
└── tests/
    ├── fixtures/                  # Shared test fixtures
    ├── functions.test.ts          # TypeScript tests
    └── rust-validation/           # Rust compilation tests
        ├── Cargo.toml
        └── lib.rs
```

## Code Generation Architecture

### TypeScript as Source of Truth for Logic

Fee calculation logic is written **once in TypeScript** ([`logic/fee-calculations.ts`](logic/fee-calculations.ts)) and automatically transpiled to Rust using an AST-based transpiler.

**Transpiled Functions** (Pure calculation logic):

- `calculateIntentTotalAmount()` → `calculate_intent_total_amount()`
- `calculateIntentTotalNetworkFee()` → `calculate_intent_total_network_fee()`
- `calculateIntentUserFee()` → `calculate_intent_user_fee()`

**TypeScript-Only Functions** (Not transpiled):

- `calculateIntentFees()` - Uses TypeScript-specific features (`typeof`, `??`, union types)

The transpiler automatically:

- Converts `switch` statements to Rust `match` expressions
- Converts `bigint` to `candid::Nat`
- Converts `BigInt()` calls to `Nat::from()`
- Handles ternary operators → `if/else`
- Converts camelCase to snake_case
- Filters out functions with TypeScript-specific operators

### To Modify Fee Logic

1. Edit [`logic/fee-calculations.ts`](logic/fee-calculations.ts)
2. Run `npm run generate`
3. Both TypeScript and Rust code are automatically updated

**Important**: Keep transpiled functions simple. Avoid:

- `typeof`, `??`, `as`, type guards
- Async/await, closures, complex types
- String manipulation, regex

## Usage

### Generate Code

```bash
# Install dependencies
cd src/shared
npm install

# Generate all code
npm run generate

# Generate types only
npm run generate:types

# Generate functions only
npm run generate:functions
```

### Use in Frontend (TypeScript/Svelte)

```typescript
// Import types
import {
	Intent,
	IntentParticipants,
	TokenStandard,
	FeeCalculationInput,
} from '../shared/generated/ts';

// Import functions
import {
	calculateIntentFees,
	calculateIntentTotalAmount,
	calculateIntentTotalNetworkFee,
} from '../shared/generated/ts';

// Calculate fees
const result = calculateIntentFees({
	intent_participants: IntentParticipants.CreatorToLink,
	token_standard: TokenStandard.ICRC2,
	user_input_amount: 100000n,
	max_use: 3,
	asset_network_fee: 10000n,
});

console.log(result.intent_total_amount); // "300000"
console.log(result.intent_total_network_fee); // "50000"
console.log(result.intent_user_fee); // "50000"
```

### Use in Backend (Rust)

```rust
// In Cargo.toml, add path to the generated code or copy files

// Import types
use crate::shared::types::{
    Intent,
    IntentParticipants,
    TokenStandard,
    FeeCalculationInput,
};

// Import functions
use crate::shared::functions::{
    calculate_intent_fees,
    calculate_intent_total_amount,
};

// Calculate fees
let input = FeeCalculationInput {
    intent_participants: IntentParticipants::CreatorToLink,
    token_standard: TokenStandard::ICRC2,
    user_input_amount: Some(Nat::from(100000u64)),
    max_use: Some(3),
    asset_network_fee: Nat::from(10000u64),
    link_creation_fee: None,
    link_max_asset_amount: None,
};

let result = calculate_intent_fees(&input);
```

## ICP Type Handling

### Principal

- **Schema**: `{ "type": "string", "format": "icp-principal" }`
- **TypeScript**: `Principal` (from `@dfinity/principal`)
- **Rust**: `candid::Principal`

### Nat (Natural Number)

- **Schema**: `{ "type": "string", "format": "icp-nat" }`
- **TypeScript**: `bigint`
- **Rust**: `candid::Nat`

## Fee Calculation Logic

The package implements fee calculation based on intent participants:

| Participants      | Total Amount          | Network Fee         | User Fee             |
| ----------------- | --------------------- | ------------------- | -------------------- |
| CreatorToTreasury | link_creation_fee     | 1x or 2x (ICRC2)    | amount + network_fee |
| CreatorToLink     | user_input \* max_use | (1-2)x + 1x per use | network_fee only     |
| UserToLink        | user_input            | (1-2)x + 1x         | network_fee only     |
| LinkToUser        | user_input            | 1x outbound         | 0 (free to receive)  |
| LinkToCreator     | link_max_amount       | 1x outbound         | network_fee          |

ICRC2 tokens require 2x inbound fee (approve + transfer_from).

## Adding New Types

1. Add type definition to `schemas/types.schema.json`
2. Run `npm run generate`
3. Generated code appears in `generated/ts/` and `generated/rust/`

## Adding or Modifying Fee Rules

1. Edit [`logic/fee-calculations.ts`](logic/fee-calculations.ts) to modify fee calculation logic
2. Run `npm run generate`
3. Both TypeScript and Rust code will be automatically updated
4. Run `npm test` to verify the changes work correctly

**Example**: To add a new `IntentParticipants` case:

```typescript
case IntentParticipants.NewCase:
  return someCalculation;
```

The transpiler will automatically convert it to Rust.

## Development

### Testing

```bash
# Run TypeScript tests (all fee calculation functions)
npm test

# Watch mode for development
npm run test:watch

# Validate Rust compilation (requires Rust/Cargo installed)
npm run test:rust

# Run full Rust tests
npm run test:rust:full

# Run all tests (TypeScript + Rust)
npm run test:all

# Clean generated files
npm run clean
```

**Note**: Rust validation requires Cargo to be installed. If you don't have Rust installed locally, the generated Rust code will still be correct - it just won't be validated until deployed to the backend build environment.

### Validation Strategy

1. **TypeScript Tests**: Run against all fee calculation functions using shared test fixtures
2. **Rust Compilation**: `cargo check` verifies generated Rust code compiles with correct types
3. **Rust Tests**: `cargo test` runs the same logic tests in Rust (optional)

The test fixtures in [`tests/fixtures/fee-calculations.json`](tests/fixtures/fee-calculations.json) are shared between TypeScript and Rust tests to ensure behavioral equivalence.

## License

MIT - Cashier Protocol Labs
