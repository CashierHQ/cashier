export type BitcoinTransaction = {
  txid: string;
  vin: UTXO[];
  vout: UTXO[];
  is_confirmed: boolean;
};

export type UTXO = {
  txid: string;
  vout: number;
  value_satoshis: number;
  address: string;
};

export class BitcoinTransactionMapper {
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
    };
  }
}
