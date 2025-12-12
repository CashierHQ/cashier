export type OmnityRuneToken = {
  token_id: string;
  symbol: string;
  decimals: number;
  rune_id: string;
};

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

export interface RuneBalance {
  rune: string;
  runeid: string;
  spacedRune: string;
  amount: string;
  symbol: string;
  divisibility: number;
}

export interface UTXOWithRunes {
  txid: string;
  vout: number;
  value: number; // satoshi amount
  scriptPubKey: string;
  address: string;
  height: number;
  confirmations: number;
  runes: RuneBalance[];
}

export interface UnisatUTXOResponse {
  code: number;
  data: {
    height: number;
    start: number;
    total: number;
    utxo: Array<{
      height: number;
      confirmations: number;
      address: string;
      satoshi: number;
      scriptPk: string;
      txid: string;
      vout: number;
      runes: RuneBalance[];
    }>;
  };
}

export interface AvailableUTXO {
  confirmations: number;
  txid: string;
  vout: number;
  satoshi: number;
  scriptType: string;
  scriptPk: string;
  codeType: number;
  address: string;
  height: number;
  idx: number;
  isOpInRBF: boolean;
  isSpent: boolean;
  isLowFee: boolean;
  inscriptionsCount: number;
  inscriptions: any[];
}

export interface AvailableUTXOResponse {
  code: number;
  msg: string;
  data: {
    cursor: number;
    total: number;
    utxo: AvailableUTXO[];
  };
}

export interface RuneBalanceInfo {
  rune: string;
  runeid: string;
  spacedRune: string;
  balance: number;
  symbol: string;
  divisibility: number;
}
