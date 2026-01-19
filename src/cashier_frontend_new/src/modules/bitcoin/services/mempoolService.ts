import {
  type BitcoinTransaction,
  BitcoinTransactionMapper,
} from "$modules/bitcoin/types.js";
import { Err, Ok, type Result } from "ts-results-es";
import { BITCOIN_MEMPOOL_API_BASE_URL } from "../constants.js";

/**
 * Service for interacting with the Bitcoin Mempool API
 */
class MempoolService {
  #baseUrl: string;

  constructor() {
    this.#baseUrl = BITCOIN_MEMPOOL_API_BASE_URL;
  }

  /**
   * Get the list of transaction IDs currently in the mempool.
   * @returns array of transaction IDs
   */
  async getMempoolTxs(): Promise<Result<string[], string>> {
    const response = await fetch(`${this.#baseUrl}/mempool/txids`);
    if (!response.ok) {
      return Err(
        `Failed to fetch mempool transactions: ${response.statusText}`,
      );
    }
    const data: string[] = await response.json();
    return Ok(data);
  }

  /**
   * Get transaction details by transaction ID.
   * @param txid
   * @returns BitcoinTransaction or error message
   */
  async getTransactionById(
    txid: string,
  ): Promise<Result<BitcoinTransaction, string>> {
    const response = await fetch(`${this.#baseUrl}/tx/${txid}`);
    if (!response.ok) {
      return Err(`Failed to fetch transaction ${txid}: ${response.statusText}`);
    }
    const data: any = await response.json();
    const transaction = BitcoinTransactionMapper.fromMempoolApiResponse(data);
    return Ok(transaction);
  }
}

export const mempoolService = new MempoolService();
