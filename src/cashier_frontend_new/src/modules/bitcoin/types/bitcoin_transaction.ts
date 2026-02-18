import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import type {
  MempoolTransaction,
  MempoolVin,
  MempoolVout,
} from "$modules/bitcoin/types/mempool";
import { Principal } from "@dfinity/principal";

/**
 * Type representing a Bitcoin transaction
 */
export type BitcoinTransaction = {
  txid: string;
  sender: string;
  vin: BitcoinVin[];
  vout: BitcoinVout[];
  is_confirmed: boolean;
  created_at_ts: number;
  block_id: bigint | null;
  block_timestamp: bigint | null;
};

/**
 * Type representing a Bitcoin transaction input
 */
export type BitcoinVin = {
  txid: string;
  vout: number;
  value_satoshis: number;
  address: string;
};

/**
 * Type representing a Bitcoin transaction output
 */
export type BitcoinVout = {
  value_satoshis: number;
  address: string;
};

/**
 * Type representing a Bitcoin block
 */
export type BitcoinBlock = {
  block_id: bigint;
  block_timestamp: bigint;
};

/**
 * Mapper class to convert between mempool API responses and BitcoinTransaction type
 */
export class BitcoinTransactionMapper {
  /**
   * Convert mempool API response to BitcoinTransaction type
   * @param data MempoolTransaction
   * @param current_ts current timestamp in seconds
   * @returns bitcoin transaction
   */
  public static fromMempoolApiResponse(
    data: MempoolTransaction,
    current_ts: number,
  ): BitcoinTransaction {
    let senderAddress = "";
    if (data.vin.length > 0 && data.vin[0].prevout) {
      senderAddress = data.vin[0].prevout.scriptpubkey_address;
    }

    return {
      sender: senderAddress,
      txid: data.txid,
      vin: data.vin.map((input: MempoolVin) => ({
        txid: input.txid,
        vout: input.vout,
        value_satoshis: input.prevout.value,
        address: input.prevout.scriptpubkey_address,
      })),
      vout: data.vout.map((output: MempoolVout) => ({
        value_satoshis: output.value,
        address: output.scriptpubkey_address,
      })),
      is_confirmed: data.status.confirmed,
      created_at_ts: current_ts,
      block_id: data.status.block_height
        ? BigInt(data.status.block_height)
        : null,
      block_timestamp: data.status.block_time
        ? BigInt(data.status.block_time)
        : null,
    };
  }

  /**
   * Map BitcoinTransaction to CreateBridgeTransactionInputArg
   * @param icpAddress
   * @param senderBtcAddress
   * @param receiverBtcAddress
   * @param bitcoinTransaction
   * @param depositFee
   * @param withdrawalFee
   * @param isImporting
   * @returns CreateBridgeTransactionInputArg
   */
  public static toCreateBridgeTransactionRequest(
    icpAddress: string,
    senderBtcAddress: string,
    receiverBtcAddress: string,
    bitcoinTransaction: BitcoinTransaction,
    depositFee: bigint,
    withdrawalFee: bigint,
    isImporting: boolean,
  ): tokenStorage.CreateBridgeTransactionInputArg {
    const asset_infos: tokenStorage.BridgeAssetInfo[] = [];
    let btcAddress = senderBtcAddress;
    if (isImporting) {
      bitcoinTransaction.vout.forEach((output) => {
        if (output.address.toLowerCase() === receiverBtcAddress.toLowerCase()) {
          asset_infos.push({
            asset_type: { BTC: null },
            asset_id: "UTXO",
            amount: BigInt(output.value_satoshis),
            decimals: 8,
          });
        }
      });
    } else {
      btcAddress = receiverBtcAddress;
    }

    return {
      btc_txid: [bitcoinTransaction.txid],
      icp_address: Principal.fromText(icpAddress),
      btc_address: btcAddress,
      asset_infos: asset_infos,
      bridge_type: isImporting ? { Import: null } : { Export: null },
      deposit_fee: [depositFee],
      withdrawal_fee: [withdrawalFee],
      created_at_ts: BigInt(bitcoinTransaction.created_at_ts),
    };
  }
}
