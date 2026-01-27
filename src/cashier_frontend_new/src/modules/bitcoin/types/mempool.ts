/**
 * Types representing a Bitcoin transactions fetched from the mempool API
 */
export type MempoolTransaction = {
  txid: string;
  vin: MempoolVin[];
  vout: MempoolVout[];
  sender: string;
  status: MempoolTransactionStatus;
};

/**
 * Type representing a transaction input
 */
export type MempoolVin = {
  txid: string;
  vout: number;
  prevout: MempoolPrevout;
};

/**
 * Type representing the previous output of a transaction input
 */
export type MempoolPrevout = {
  scriptpubkey_type: string;
  scriptpubkey_address: string;
  value: number;
};

/**
 * Type representing a transaction output
 */
export type MempoolVout = {
  txid: string | null;
  vout: number | null;
  scriptpubkey_type: string;
  scriptpubkey_address: string;
  value: number;
};

/**
 * Type representing the status of a transaction
 */
export type MempoolTransactionStatus = {
  confirmed: boolean;
  block_height: number | null;
  block_time: number | null;
};

/**
 * Type representing a Bitcoin block from the mempool API
 */
export type MempoolBlock = {
  id: string;
  height: number;
  timestamp: number;
};
