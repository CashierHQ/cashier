import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { Principal } from "@dfinity/principal";

/**
 * BitcoinTransaction type representing a Bitcoin transaction
 */
export type BitcoinTransaction = {
  txid: string;
  sender: string;
  vin: UTXO[];
  vout: UTXO[];
  is_confirmed: boolean;
  created_at_ts: number;
  block_id: bigint | null;
  block_timestamp: bigint | null;
};

/**
 * UTXO type representing an unspent transaction output
 */
export type UTXO = {
  txid: string;
  vout: number;
  value_satoshis: number;
  address: string;
};

/**
 * BitcoinBlock type representing a Bitcoin block
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
   * @param data json response from mempool API
   * @param current_ts current timestamp in seconds
   * @returns bitcoin transaction
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromMempoolApiResponse(
    data: any,
    current_ts: number,
  ): BitcoinTransaction {
    let senderAddress = "";
    if (data.vin.length > 0 && data.vin[0].prevout) {
      senderAddress = data.vin[0].prevout.scriptpubkey_address;
    }

    return {
      sender: senderAddress,
      txid: data.txid,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vin: data.vin.map((input: any) => ({
        txid: input.txid,
        vout: input.vout,
        value_satoshis: input.prevout.value,
        address: input.prevout.scriptpubkey_address,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vout: data.vout.map((output: any) => ({
        txid: output.txid,
        vout: output.vout,
        value_satoshis: output.value,
        address: output.scriptpubkey_address,
      })),
      is_confirmed: data.status.confirmed,
      created_at_ts: current_ts,
      block_id: data.status.block_height,
      block_timestamp: data.status.block_time,
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
