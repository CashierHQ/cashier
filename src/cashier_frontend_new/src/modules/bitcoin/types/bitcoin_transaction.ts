import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { Principal } from "@dfinity/principal";

export type BitcoinTransaction = {
  txid: string;
  vin: UTXO[];
  vout: UTXO[];
  is_confirmed: boolean;
  created_at_ts: number;
};

export type UTXO = {
  txid: string;
  vout: number;
  value_satoshis: number;
  address: string;
};

export class BitcoinTransactionMapper {
  /**
   * Convert mempool API response to BitcoinTransaction type
   * @param data json response from mempool API
   * @returns bitcoin transaction
   */
  public static fromMempoolApiResponse(data: any): BitcoinTransaction {
    return {
      txid: data.txid,
      vin: data.vin.map((input: any) => ({
        txid: input.txid,
        vout: input.vout,
        value_satoshis: input.prevout.value,
        address: input.prevout.scriptpubkey_address,
      })),
      vout: data.vout.map((output: any) => ({
        txid: output.txid,
        vout: output.vout,
        value_satoshis: output.value,
        address: output.scriptpubkey_address,
      })),
      is_confirmed: data.is_confirmed,
      created_at_ts: data.firstSeen,
    };
  }

  public static toCreateBridgeTransactionRequest(
    icp_address: string,
    btcAddress: string,
    bitcoinTransaction: BitcoinTransaction,
  ): tokenStorage.CreateBridgeTransactionInputArg {
    let asset_infos = [
      {
        asset_type: { BTC: null },
        asset_id: "",
        ledger_id: [] as [] | [Principal],
        amount: 0n,
        decimals: 8,
      },
    ];
    return {
      btc_txid: [bitcoinTransaction.txid],
      icp_address: Principal.fromText(icp_address),
      btc_address: btcAddress,
      asset_infos: asset_infos,
      bridge_type: { Import: null },
      created_at_ts: BigInt(bitcoinTransaction.created_at_ts),
    };
  }
}
