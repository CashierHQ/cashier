// lib/runes/runestone-helper.ts
import { encodeRunestone } from "@magiceden-oss/runestone-lib";

export interface RuneEtchingParams {
  runeName: string;
  symbol?: string;
  divisibility?: number;
  premine?: string;
  terms?: {
    amount?: string;
    cap?: string;
    heightStart?: number;
    heightEnd?: number;
    offsetStart?: number;
    offsetEnd?: number;
  };
  turbo?: boolean;
}

export function createEtchingRunestone(params: RuneEtchingParams): Buffer {
  const etchingSpec: any = {
    etching: {
      runeName: params.runeName.toUpperCase(),
      divisibility: params.divisibility ?? 0,
      premine: params.premine ? BigInt(params.premine) : 0n,
      symbol: params.symbol ?? "",
      turbo: params.turbo ?? false,
    },
  };

  // Add terms if provided
  if (params.terms && (params.terms.amount || params.terms.cap)) {
    etchingSpec.etching.terms = {
      amount: params.terms.amount ? BigInt(params.terms.amount) : undefined,
      cap: params.terms.cap ? BigInt(params.terms.cap) : undefined,
      height: {},
      offset: {},
    };

    // Add height constraints if provided
    if (params.terms.heightStart !== undefined) {
      etchingSpec.etching.terms.height.start = BigInt(params.terms.heightStart);
    }
    if (params.terms.heightEnd !== undefined) {
      etchingSpec.etching.terms.height.end = BigInt(params.terms.heightEnd);
    }

    // Add offset constraints if provided
    if (params.terms.offsetStart !== undefined) {
      etchingSpec.etching.terms.offset.start = BigInt(params.terms.offsetStart);
    }
    if (params.terms.offsetEnd !== undefined) {
      etchingSpec.etching.terms.offset.end = BigInt(params.terms.offsetEnd);
    }

    // Clean up empty objects
    if (Object.keys(etchingSpec.etching.terms.height).length === 0) {
      delete etchingSpec.etching.terms.height;
    }
    if (Object.keys(etchingSpec.etching.terms.offset).length === 0) {
      delete etchingSpec.etching.terms.offset;
    }
  }

  console.log(
    "Etching spec:",
    JSON.stringify(
      etchingSpec,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    ),
  );

  // Encode the runestone
  const encoded = encodeRunestone(etchingSpec);

  return Buffer.from(encoded);
}

// Helper to create mint runestone
export function createMintRunestone(block: bigint, tx: number): Buffer {
  const mintSpec = {
    mint: {
      block,
      tx,
    },
  };

  const encoded = encodeRunestone(mintSpec);
  return Buffer.from(encoded);
}

// Helper to create transfer runestone
export function createTransferRunestone(
  block: bigint,
  tx: number,
  amount: bigint,
  output: number,
): Buffer {
  const edictSpec = {
    edicts: [
      {
        id: {
          block,
          tx,
        },
        amount,
        output,
      },
    ],
  };

  const encoded = encodeRunestone(edictSpec);
  return Buffer.from(encoded);
}
