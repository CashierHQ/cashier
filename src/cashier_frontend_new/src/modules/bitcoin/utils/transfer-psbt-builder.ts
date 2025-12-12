import { encodeRunestone } from "@magiceden-oss/runestone-lib";
import * as bitcoin from "bitcoinjs-lib";
import type { AvailableUTXO, UTXOWithRunes } from "../types";
import { getUTXOsForTransfer, selectUTXOsForAmount } from "./query-builder";

export interface TransferPSBTParamsV2 {
  fromAddress: string;
  toAddress: string;
  runeId: string; // e.g., "840000:3"
  transferAmount: bigint; // Amount of runes to send
  feeRate: number; // sat/vB
  network: "mainnet" | "testnet";
  apiKey: string; // Unisat API key
}

interface PreparedTransferData {
  runeUTXOs: UTXOWithRunes[];
  feeUTXOs: AvailableUTXO[];
  totalRuneAmount: bigint;
  totalBTC: number;
  runeName: string;
  runeSymbol: string;
  divisibility: number;
}

// Step 1: Prepare UTXOs for transfer
async function prepareTransferUTXOs(
  params: TransferPSBTParamsV2,
): Promise<PreparedTransferData> {
  console.log("🔍 Step 1: Fetching rune UTXOs...");

  // Get UTXOs containing the specific rune
  const { runeUTXOs, totalRuneAmount } = await getUTXOsForTransfer(
    params.fromAddress,
    params.runeId,
    params.transferAmount,
    params.apiKey,
    params.network,
  );

  if (totalRuneAmount < params.transferAmount) {
    throw new Error(
      `Insufficient rune balance. Required: ${params.transferAmount}, Available: ${totalRuneAmount}`,
    );
  }

  console.log(`✅ Selected ${runeUTXOs.length} rune UTXOs`);
  console.log(`   Total rune amount: ${totalRuneAmount}`);
  console.log(`   Transfer amount: ${params.transferAmount}`);
  console.log(`   Rune change: ${totalRuneAmount - params.transferAmount}`);

  // Get rune details from first UTXO
  const runeDetails = runeUTXOs[0].runes.find(
    (r) => r.runeid === params.runeId,
  );
  if (!runeDetails) {
    throw new Error(`Rune ${params.runeId} not found in selected UTXOs`);
  }

  console.log("\n🔍 Step 2: Estimating fees and selecting fee UTXOs...");

  // Calculate total BTC in rune UTXOs
  const btcInRuneUTXOs = runeUTXOs.reduce((sum, utxo) => sum + utxo.value, 0);

  // Estimate transaction size
  const estimatedSize =
    10 + // version, locktime
    runeUTXOs.length * 148 + // rune inputs
    4 * 34 + // 4 outputs (OP_RETURN + recipient + rune change + BTC change)
    100; // runestone data (estimate)

  const estimatedFee = Math.ceil(estimatedSize * params.feeRate);

  // We need: fee + 2 dust outputs (546 each)
  const totalNeeded = estimatedFee + 546 + 546;

  console.log(`   Estimated size: ${estimatedSize} bytes`);
  console.log(`   Estimated fee: ${estimatedFee} sats`);
  console.log(`   Dust outputs: ${546 + 546} sats`);
  console.log(`   Total needed: ${totalNeeded} sats`);
  console.log(`   BTC in rune UTXOs: ${btcInRuneUTXOs} sats`);

  let feeUTXOs: AvailableUTXO[] = [];
  let totalBTC = btcInRuneUTXOs;

  // Check if we need additional UTXOs for fees
  if (btcInRuneUTXOs < totalNeeded) {
    const additionalNeeded = totalNeeded - btcInRuneUTXOs;
    console.log(`   Need additional ${additionalNeeded} sats for fees`);

    const { selectedUTXOs, totalAmount } = await selectUTXOsForAmount(
      params.fromAddress,
      additionalNeeded,
      params.apiKey,
      params.network,
    );

    feeUTXOs = selectedUTXOs;
    totalBTC += totalAmount;

    console.log(
      `✅ Selected ${feeUTXOs.length} fee UTXOs (${totalAmount} sats)`,
    );
  } else {
    console.log(`✅ Rune UTXOs have enough BTC for fees`);
  }

  console.log(`   Total BTC available: ${totalBTC} sats\n`);

  return {
    runeUTXOs,
    feeUTXOs,
    totalRuneAmount,
    totalBTC,
    runeName: runeDetails.rune,
    runeSymbol: runeDetails.symbol,
    divisibility: runeDetails.divisibility,
  };
}

// Step 2: Build the transfer PSBT
export async function createTransferPSBT(
  params: TransferPSBTParamsV2,
): Promise<string> {
  // Prepare UTXOs
  const prepared = await prepareTransferUTXOs(params);

  const network =
    params.network === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

  const psbt = new bitcoin.Psbt({ network });

  console.log("🔨 Step 3: Building PSBT...\n");

  // Add rune inputs
  console.log(`📥 Adding ${prepared.runeUTXOs.length} rune inputs:`);
  for (const utxo of prepared.runeUTXOs) {
    const scriptPubKey = Buffer.from(utxo.scriptPubKey, "hex");

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: scriptPubKey,
        value: utxo.value,
      },
    });

    console.log(`   ${utxo.txid}:${utxo.vout} (${utxo.value} sats)`);
  }

  // Add fee inputs
  if (prepared.feeUTXOs.length > 0) {
    console.log(`\n📥 Adding ${prepared.feeUTXOs.length} fee inputs:`);
    for (const utxo of prepared.feeUTXOs) {
      const scriptPubKey = Buffer.from(utxo.scriptPk, "hex");

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: scriptPubKey,
          value: utxo.satoshi,
        },
      });

      console.log(`   ${utxo.txid}:${utxo.vout} (${utxo.satoshi} sats)`);
    }
  }

  // Calculate rune change
  const runeChange = prepared.totalRuneAmount - params.transferAmount;

  console.log("\n📤 Creating runestone with edicts:");
  console.log(
    `   Edict 1: Send ${params.transferAmount} to recipient (output 0)`,
  );
  console.log(`   Edict 2: Send ${runeChange} back to self (output 1)`);

  // Create transfer runestone with TWO edicts
  const [block, tx] = params.runeId.split(":");
  const transferSpec = {
    edicts: [
      {
        id: {
          block: BigInt(block),
          tx: parseInt(tx),
        },
        amount: params.transferAmount,
        output: 0, // Recipient (first non-OP_RETURN output)
      },
      {
        id: {
          block: BigInt(block),
          tx: parseInt(tx),
        },
        amount: runeChange,
        output: 1, // Rune change back to self (second non-OP_RETURN output)
      },
    ],
  };

  // Encode runestone
  const runestoneEncoded = encodeRunestone(transferSpec);

  // DEBUG: Check what we got
  console.log("🔍 Runestone encoded type:", typeof runestoneEncoded);
  console.log("🔍 Runestone encoded value:", runestoneEncoded);

  // FIX: Extract the actual encoded data
  let runestoneData: Uint8Array | Buffer;

  if (runestoneEncoded && typeof runestoneEncoded === "object") {
    // Check if it has the encodedRunestone property
    if (
      "encodedRunestone" in runestoneEncoded &&
      runestoneEncoded.encodedRunestone
    ) {
      runestoneData = runestoneEncoded.encodedRunestone;
      console.log("✅ Extracted encodedRunestone property");
    } else {
      runestoneData = runestoneEncoded;
      console.log("✅ Using runestoneEncoded directly");
    }
  } else {
    runestoneData = runestoneEncoded;
  }

  console.log("🔍 Runestone data type:", typeof runestoneData);
  console.log(
    "🔍 Runestone is Uint8Array?",
    runestoneData instanceof Uint8Array,
  );
  console.log("🔍 Runestone is Buffer?", Buffer.isBuffer(runestoneData));
  console.log("🔍 Runestone length:", runestoneData?.length);

  if (runestoneData && runestoneData.length > 0) {
    console.log("🔍 First 10 bytes:", Array.from(runestoneData.slice(0, 10)));
  }

  // Validate we have data
  if (!runestoneData || runestoneData.length === 0) {
    throw new Error("Failed to encode runestone - got empty result");
  }

  // Convert to Buffer
  let runestoneBuffer: Buffer;
  if (runestoneData instanceof Uint8Array) {
    runestoneBuffer = Buffer.from(runestoneData);
  } else if (Buffer.isBuffer(runestoneData)) {
    runestoneBuffer = runestoneData;
  } else if (Array.isArray(runestoneData)) {
    runestoneBuffer = Buffer.from(runestoneData);
  } else if (runestoneData?.buffer) {
    runestoneBuffer = Buffer.from(runestoneData.buffer);
  } else if (typeof runestoneData === "object") {
    const arr = Object.keys(runestoneData)
      .filter((k) => !isNaN(Number(k)))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => runestoneData[k]);
    runestoneBuffer = Buffer.from(arr);
  } else {
    throw new Error(
      `Unexpected runestone encoding type: ${typeof runestoneData}`,
    );
  }

  console.log(`\n✅ Runestone encoded: ${runestoneBuffer.toString("hex")}`);
  console.log(`   Length: ${runestoneBuffer.length} bytes`);

  // Output 0: OP_RETURN (runestone)
  const opReturnScript = bitcoin.script.compile([
    bitcoin.opcodes.OP_RETURN,
    bitcoin.opcodes.OP_13,
    runestoneBuffer,
  ]);

  psbt.addOutput({
    script: opReturnScript,
    value: 0,
  });

  console.log("\n📤 Adding outputs:");
  console.log(`   Output 0: OP_RETURN (runestone)`);

  // Output 1: Recipient (gets transferred runes)
  const recipientScript = bitcoin.address.toOutputScript(
    params.toAddress,
    network,
  );

  psbt.addOutput({
    script: recipientScript,
    value: 546,
  });

  console.log(`   Output 1: Recipient ${params.toAddress}`);
  console.log(
    `             546 sats + ${params.transferAmount} ${prepared.runeName}`,
  );

  // Output 2: Rune change (gets remaining runes)
  const runeChangeScript = bitcoin.address.toOutputScript(
    params.fromAddress,
    network,
  );

  psbt.addOutput({
    script: runeChangeScript,
    value: 546,
  });

  console.log(`   Output 2: Rune change ${params.fromAddress}`);
  console.log(`             546 sats + ${runeChange} ${prepared.runeName}`);

  // Calculate actual fee
  const totalInputs = prepared.runeUTXOs.length + prepared.feeUTXOs.length;
  const actualSize = 10 + totalInputs * 148 + 4 * 34 + runestoneBuffer.length;
  const actualFee = Math.ceil(actualSize * params.feeRate);

  console.log(`\n💰 Fee calculation:`);
  console.log(`   Transaction size: ${actualSize} bytes`);
  console.log(`   Fee rate: ${params.feeRate} sat/vB`);
  console.log(`   Total fee: ${actualFee} sats`);

  // Output 3: BTC change
  const btcChangeAmount = prepared.totalBTC - actualFee - 546 - 546;

  if (btcChangeAmount < 546) {
    throw new Error(
      `Insufficient BTC for transaction. ` +
        `Need ${actualFee + 546 + 546 + 546} sats, ` +
        `but only have ${prepared.totalBTC} sats. ` +
        `Missing ${actualFee + 546 + 546 + 546 - prepared.totalBTC} sats.`,
    );
  }

  const btcChangeScript = bitcoin.address.toOutputScript(
    params.fromAddress,
    network,
  );

  psbt.addOutput({
    script: btcChangeScript,
    value: btcChangeAmount,
  });

  console.log(`   Output 3: BTC change ${params.fromAddress}`);
  console.log(`             ${btcChangeAmount} sats`);

  console.log("\n" + "═".repeat(60));
  console.log("✅ PSBT CREATED SUCCESSFULLY");
  console.log("═".repeat(60));
  console.log(`📊 Summary:`);
  console.log(
    `   Total Inputs: ${totalInputs} (${prepared.runeUTXOs.length} rune + ${prepared.feeUTXOs.length} fee)`,
  );
  console.log(
    `   Total Outputs: 4 (OP_RETURN + recipient + rune change + BTC change)`,
  );
  console.log(
    `   Rune Transfer: ${params.transferAmount} ${prepared.runeName} ${prepared.runeSymbol}`,
  );
  console.log(
    `   Rune Change: ${runeChange} ${prepared.runeName} ${prepared.runeSymbol}`,
  );
  console.log(`   BTC Change: ${btcChangeAmount} sats`);
  console.log(`   Fee: ${actualFee} sats (${params.feeRate} sat/vB)`);
  console.log("═".repeat(60) + "\n");

  return psbt.toBase64();
}

// Simplified version for direct use
export async function createTransferPSBTSimple(
  fromAddress: string,
  toAddress: string,
  runeId: string,
  transferAmount: bigint,
  feeRate: number,
  apiKey: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<string> {
  return createTransferPSBT({
    fromAddress,
    toAddress,
    runeId,
    transferAmount,
    feeRate,
    network,
    apiKey,
  });
}
