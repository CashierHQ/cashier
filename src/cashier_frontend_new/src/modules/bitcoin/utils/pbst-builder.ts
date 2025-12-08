// lib/runes/browser-helper.ts
import { encodeRunestone } from "@magiceden-oss/runestone-lib";
import * as bitcoin from "bitcoinjs-lib";

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

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey?: string;
}

export interface EtchingPSBTParams {
  utxos: UTXO[];
  address: string;
  etchingParams: RuneEtchingParams;
  feeRate: number;
  network: "mainnet" | "testnet";
}

export interface MintPSBTParams {
  utxos: UTXO[];
  address: string;
  runeId: {
    block: bigint;
    tx: number;
  };
  feeRate: number;
  network: "mainnet" | "testnet";
}

export interface TransferPSBTParams {
  utxos: UTXO[];
  fromAddress: string;
  toAddress: string;
  runeId: {
    block: bigint;
    tx: number;
  };
  amount: bigint;
  feeRate: number;
  network: "mainnet" | "testnet";
}

// Etching PSBT builder
export async function createEtchingPSBT(
  params: EtchingPSBTParams,
): Promise<string> {
  const network =
    params.network === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

  const psbt = new bitcoin.Psbt({ network });

  // Add inputs
  let totalInput = 0;
  for (const utxo of params.utxos) {
    let scriptPubKey: Buffer;
    if (utxo.scriptPubKey) {
      scriptPubKey = Buffer.from(utxo.scriptPubKey, "hex");
    } else {
      scriptPubKey = bitcoin.address.toOutputScript(params.address, network);
    }

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: scriptPubKey,
        value: utxo.value,
      },
    });
    totalInput += utxo.value;
  }

  // Create runestone spec
  const etchingSpec: any = {
    etching: {
      runeName: params.etchingParams.runeName.toUpperCase(),
      divisibility: params.etchingParams.divisibility ?? 0,
      premine: params.etchingParams.premine
        ? BigInt(params.etchingParams.premine)
        : 0n,
      symbol: params.etchingParams.symbol ?? "",
      turbo: params.etchingParams.turbo ?? false,
    },
  };

  // Add terms if specified
  if (
    params.etchingParams.terms &&
    (params.etchingParams.terms.amount || params.etchingParams.terms.cap)
  ) {
    etchingSpec.etching.terms = {};

    if (params.etchingParams.terms.amount) {
      etchingSpec.etching.terms.amount = BigInt(
        params.etchingParams.terms.amount,
      );
    }
    if (params.etchingParams.terms.cap) {
      etchingSpec.etching.terms.cap = BigInt(params.etchingParams.terms.cap);
    }

    // Add height constraints if provided
    if (
      params.etchingParams.terms.heightStart !== undefined ||
      params.etchingParams.terms.heightEnd !== undefined
    ) {
      etchingSpec.etching.terms.height = {};
      if (params.etchingParams.terms.heightStart !== undefined) {
        etchingSpec.etching.terms.height.start = BigInt(
          params.etchingParams.terms.heightStart,
        );
      }
      if (params.etchingParams.terms.heightEnd !== undefined) {
        etchingSpec.etching.terms.height.end = BigInt(
          params.etchingParams.terms.heightEnd,
        );
      }
    }

    // Add offset constraints if provided
    if (
      params.etchingParams.terms.offsetStart !== undefined ||
      params.etchingParams.terms.offsetEnd !== undefined
    ) {
      etchingSpec.etching.terms.offset = {};
      if (params.etchingParams.terms.offsetStart !== undefined) {
        etchingSpec.etching.terms.offset.start = BigInt(
          params.etchingParams.terms.offsetStart,
        );
      }
      if (params.etchingParams.terms.offsetEnd !== undefined) {
        etchingSpec.etching.terms.offset.end = BigInt(
          params.etchingParams.terms.offsetEnd,
        );
      }
    }
  }

  console.log(
    "📝 Etching spec:",
    JSON.stringify(
      etchingSpec,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    ),
  );

  // Encode runestone
  const runestoneEncoded = encodeRunestone(etchingSpec);

  console.log("🔍 Runestone encoded type:", typeof runestoneEncoded);
  console.log(
    "🔍 Runestone encoded constructor:",
    runestoneEncoded?.constructor?.name,
  );

  // Convert to Buffer - handle different possible return types
  let runestoneBuffer: Buffer;

  if (runestoneEncoded instanceof Uint8Array) {
    // It's already a Uint8Array, convert to Buffer
    runestoneBuffer = Buffer.from(runestoneEncoded);
  } else if (Buffer.isBuffer(runestoneEncoded)) {
    // It's already a Buffer
    runestoneBuffer = runestoneEncoded;
  } else if (Array.isArray(runestoneEncoded)) {
    // It's an array of numbers
    runestoneBuffer = Buffer.from(runestoneEncoded);
  } else if (runestoneEncoded?.buffer) {
    // It has a buffer property (like ArrayBuffer view)
    runestoneBuffer = Buffer.from(runestoneEncoded.buffer);
  } else if (typeof runestoneEncoded === "object") {
    // It's an object with numeric keys - convert to array first
    const arr = Object.keys(runestoneEncoded)
      .filter((k) => !isNaN(Number(k)))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => runestoneEncoded[k]);
    runestoneBuffer = Buffer.from(arr);
  } else {
    throw new Error(
      `Unexpected runestone encoding type: ${typeof runestoneEncoded}`,
    );
  }

  console.log("✅ Runestone hex:", runestoneBuffer.toString("hex"));
  console.log("✅ Runestone length:", runestoneBuffer.length);

  // Create OP_RETURN output
  const opReturnScript = bitcoin.script.compile([
    bitcoin.opcodes.OP_RETURN,
    bitcoin.opcodes.OP_13,
    runestoneBuffer,
  ]);

  psbt.addOutput({
    script: opReturnScript,
    value: 0,
  });

  // Calculate fee
  const estimatedSize =
    10 + params.utxos.length * 148 + 2 * 34 + runestoneBuffer.length;
  const fee = Math.ceil(estimatedSize * params.feeRate);

  console.log("💰 Estimated size:", estimatedSize, "bytes");
  console.log("💰 Fee rate:", params.feeRate, "sat/vB");
  console.log("💰 Total fee:", fee, "sats");

  // Add change
  const changeAmount = totalInput - fee;

  if (changeAmount < 546) {
    throw new Error(
      `Insufficient funds. Need at least ${fee + 546} sats, but only have ${totalInput} sats. ` +
        `Missing ${fee + 546 - totalInput} sats.`,
    );
  }

  const changeScript = bitcoin.address.toOutputScript(params.address, network);

  psbt.addOutput({
    script: changeScript,
    value: changeAmount,
  });

  console.log("✅ Etching PSBT created successfully");
  console.log("📊 Inputs:", params.utxos.length);
  console.log("📊 Outputs: 2 (OP_RETURN + change)");
  console.log("📊 Change amount:", changeAmount, "sats");

  return psbt.toBase64();
}

// Mint PSBT builder
export async function createMintPSBT(params: MintPSBTParams): Promise<string> {
  const network =
    params.network === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

  const psbt = new bitcoin.Psbt({ network });

  // Add inputs
  let totalInput = 0;
  for (const utxo of params.utxos) {
    let scriptPubKey: Buffer;
    if (utxo.scriptPubKey) {
      scriptPubKey = Buffer.from(utxo.scriptPubKey, "hex");
    } else {
      scriptPubKey = bitcoin.address.toOutputScript(params.address, network);
    }

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: scriptPubKey,
        value: utxo.value,
      },
    });
    totalInput += utxo.value;
  }

  console.log("📊 Total input:", totalInput, "sats");

  // Create mint runestone
  const mintSpec = {
    mint: {
      block: params.runeId.block,
      tx: params.runeId.tx,
    },
  };

  console.log(
    "🪙 Mint spec:",
    JSON.stringify(
      mintSpec,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    ),
  );

  // Encode runestone
  const runestoneEncoded = encodeRunestone(mintSpec);

  // DEBUG: Check what we got back
  console.log("🔍 Raw encoded type:", typeof runestoneEncoded);
  console.log(
    "🔍 Raw encoded constructor:",
    runestoneEncoded?.constructor?.name,
  );
  console.log("🔍 Is Uint8Array?", runestoneEncoded instanceof Uint8Array);
  console.log("🔍 Is Array?", Array.isArray(runestoneEncoded));
  console.log("🔍 Has buffer property?", runestoneEncoded?.buffer);
  console.log("🔍 Keys:", Object.keys(runestoneEncoded).slice(0, 10));

  // Convert to Buffer - handle different possible return types
  let runestoneBuffer: Buffer;

  if (runestoneEncoded instanceof Uint8Array) {
    // It's already a Uint8Array, convert to Buffer
    runestoneBuffer = Buffer.from(runestoneEncoded);
  } else if (Buffer.isBuffer(runestoneEncoded)) {
    // It's already a Buffer
    runestoneBuffer = runestoneEncoded;
  } else if (Array.isArray(runestoneEncoded)) {
    // It's an array of numbers
    runestoneBuffer = Buffer.from(runestoneEncoded);
  } else if (runestoneEncoded?.buffer) {
    // It has a buffer property (like ArrayBuffer view)
    runestoneBuffer = Buffer.from(runestoneEncoded.buffer);
  } else if (typeof runestoneEncoded === "object") {
    // It's an object with numeric keys - convert to array first
    const arr = Object.keys(runestoneEncoded)
      .filter((k) => !isNaN(Number(k)))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => runestoneEncoded[k]);
    runestoneBuffer = Buffer.from(arr);
  } else {
    throw new Error(
      `Unexpected runestone encoding type: ${typeof runestoneEncoded}`,
    );
  }

  console.log("✅ Runestone hex:", runestoneBuffer.toString("hex"));
  console.log("✅ Runestone length:", runestoneBuffer.length);

  // Create OP_RETURN output
  const opReturnScript = bitcoin.script.compile([
    bitcoin.opcodes.OP_RETURN,
    bitcoin.opcodes.OP_13,
    runestoneBuffer,
  ]);

  psbt.addOutput({
    script: opReturnScript,
    value: 0,
  });

  // Calculate fee
  const estimatedSize =
    10 + params.utxos.length * 148 + 2 * 34 + runestoneBuffer.length;
  const fee = Math.ceil(estimatedSize * params.feeRate);

  console.log("💰 Estimated size:", estimatedSize, "bytes");
  console.log("💰 Fee rate:", params.feeRate, "sat/vB");
  console.log("💰 Total fee:", fee, "sats");

  // Add change
  const changeAmount = totalInput - fee;

  if (changeAmount < 546) {
    throw new Error(
      `Insufficient funds. Need at least ${fee + 546} sats, but only have ${totalInput} sats. ` +
        `Missing ${fee + 546 - totalInput} sats.`,
    );
  }

  const changeScript = bitcoin.address.toOutputScript(params.address, network);

  psbt.addOutput({
    script: changeScript,
    value: changeAmount,
  });

  console.log("✅ Mint PSBT created successfully");
  console.log("📊 Inputs:", params.utxos.length);
  console.log("📊 Outputs: 2 (OP_RETURN + change)");
  console.log("📊 Change amount:", changeAmount, "sats");

  return psbt.toBase64();
}

// NEW: Transfer PSBT builder
export async function createTransferPSBT(
  params: TransferPSBTParams,
): Promise<string> {
  const network =
    params.network === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

  const psbt = new bitcoin.Psbt({ network });

  // Add inputs
  let totalInput = 0;
  for (const utxo of params.utxos) {
    let scriptPubKey: Buffer;
    if (utxo.scriptPubKey) {
      scriptPubKey = Buffer.from(utxo.scriptPubKey, "hex");
    } else {
      scriptPubKey = bitcoin.address.toOutputScript(
        params.fromAddress,
        network,
      );
    }

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: scriptPubKey,
        value: utxo.value,
      },
    });
    totalInput += utxo.value;
  }

  console.log("📊 Total input:", totalInput, "sats");

  // Create transfer edict
  const transferSpec = {
    edicts: [
      {
        id: {
          block: params.runeId.block,
          tx: params.runeId.tx,
        },
        amount: params.amount,
        output: 1, // Send to output 1 (recipient address)
      },
    ],
  };

  console.log(
    "📤 Transfer spec:",
    JSON.stringify(
      transferSpec,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2,
    ),
  );

  const runestoneEncoded = encodeRunestone(transferSpec);
  const runestoneBuffer = Buffer.from(runestoneEncoded);

  console.log("✅ Runestone hex:", runestoneBuffer.toString("hex"));
  console.log("✅ Runestone length:", runestoneBuffer.length);

  // Create OP_RETURN output (index 0)
  const opReturnScript = bitcoin.script.compile([
    bitcoin.opcodes.OP_RETURN,
    bitcoin.opcodes.OP_13,
    runestoneBuffer,
  ]);

  psbt.addOutput({
    script: opReturnScript,
    value: 0,
  });

  // Recipient output (index 1) - receives the runes
  const recipientScript = bitcoin.address.toOutputScript(
    params.toAddress,
    network,
  );

  psbt.addOutput({
    script: recipientScript,
    value: 546, // Dust amount
  });

  // Calculate fee
  const estimatedSize =
    10 + params.utxos.length * 148 + 3 * 34 + runestoneBuffer.length;
  const fee = Math.ceil(estimatedSize * params.feeRate);

  console.log("💰 Estimated size:", estimatedSize, "bytes");
  console.log("💰 Fee rate:", params.feeRate, "sat/vB");
  console.log("💰 Total fee:", fee, "sats");

  // Add change (index 2)
  const changeAmount = totalInput - fee - 546; // Subtract dust for recipient

  if (changeAmount < 546) {
    throw new Error(
      `Insufficient funds. Need at least ${fee + 546 + 546} sats, but only have ${totalInput} sats. ` +
        `Missing ${fee + 546 + 546 - totalInput} sats.`,
    );
  }

  const changeScript = bitcoin.address.toOutputScript(
    params.fromAddress,
    network,
  );

  psbt.addOutput({
    script: changeScript,
    value: changeAmount,
  });

  console.log("✅ Transfer PSBT created successfully");
  console.log("📊 Inputs:", params.utxos.length);
  console.log("📊 Outputs: 3 (OP_RETURN + recipient + change)");
  console.log("📊 Recipient amount:", 546, "sats (+ runes)");
  console.log("📊 Change amount:", changeAmount, "sats");

  return psbt.toBase64();
}
