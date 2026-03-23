import { MEMPOOL_API_BASE_URLS } from "$modules/bitcoin/constants";
import {
  BitcoinTransactionMapper,
  type BitcoinBlock,
  type BitcoinTransaction,
} from "$modules/bitcoin/types/bitcoin_transaction";
import type {
  MempoolBlock,
  MempoolTransaction,
} from "$modules/bitcoin/types/mempool";
import { currentSecondTimestamp } from "$modules/shared/utils/datetimeUtils";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Service for interacting with the Bitcoin Mempool API.
 * Supports multiple base URLs with automatic fallback for fault tolerance.
 */
class MempoolService {
  #baseUrls: string[];

  constructor() {
    this.#baseUrls = MEMPOOL_API_BASE_URLS;
  }

  /**
   * Attempt a fetch against each configured base URL in order,
   * falling back to the next if the current one fails or returns a non-ok response.
   * @param path API path (e.g. "/mempool/txids")
   * @returns Response from the first successful endpoint
   * @throws Error if all endpoints are exhausted
   */
  async #fetchWithFallback(path: string): Promise<Response> {
    let lastError: unknown;
    for (const baseUrl of this.#baseUrls) {
      try {
        const response = await fetch(`${baseUrl}${path}`);
        if (response.ok) {
          return response;
        }
        lastError = new Error(
          `Non-ok response from ${baseUrl}${path}: ${response.status} ${response.statusText}`,
        );
        console.warn(`Mempool endpoint ${baseUrl} failed, trying next...`);
      } catch (error) {
        lastError = error;
        console.warn(
          `Mempool endpoint ${baseUrl} threw an error, trying next:`,
          error,
        );
      }
    }
    throw lastError ?? new Error("All mempool endpoints exhausted");
  }

  /**
   * Get the list of transaction IDs currently in the mempool.
   * @returns array of transaction IDs
   */
  async getMempoolTxs(): Promise<Result<string[], string>> {
    try {
      const response = await this.#fetchWithFallback("/mempool/txids");
      const data: string[] = await response.json();
      return Ok(data);
    } catch (error) {
      return Err(
        `Error fetching mempool transactions: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get transaction details by transaction ID.
   * @param txid
   * @returns BitcoinTransaction or error message
   */
  async getTransactionById(
    txid: string,
  ): Promise<Result<BitcoinTransaction, string>> {
    try {
      const response = await this.#fetchWithFallback(`/tx/${txid}`);
      const data: MempoolTransaction = await response.json();
      const transaction = BitcoinTransactionMapper.fromMempoolApiResponse(
        data,
        currentSecondTimestamp(),
      );
      return Ok(transaction);
    } catch (error) {
      return Err(
        `Error fetching transaction ${txid}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get the current tip height of the Bitcoin blockchain.
   * @returns tip height or error message
   */
  async getTipHeight(): Promise<Result<bigint, string>> {
    try {
      const response = await this.#fetchWithFallback("/blocks/tip/height");
      const data: bigint = BigInt(await response.json());
      return Ok(data);
    } catch (error) {
      return Err(`Error fetching tip height: ${(error as Error).message}`);
    }
  }

  /**
   * Get block details by height.
   * @param height
   * @param start_block
   * @returns array of BitcoinBlock or empty array
   */
  async getLatestBlocksFromHeight(
    height: number,
    start_block: number,
  ): Promise<BitcoinBlock[] | []> {
    try {
      const response = await this.#fetchWithFallback(`/blocks/${height}`);
      const data: MempoolBlock[] = await response.json();
      const blocks: BitcoinBlock[] = [];
      for (const block of data) {
        if (block.height >= start_block) {
          blocks.push({
            block_id: BigInt(block.height),
            block_timestamp: BigInt(block.timestamp),
          });
        }
      }

      // reverse to have oldest block first
      blocks.reverse();
      return blocks;
    } catch (error) {
      console.error(
        `Error fetching block at height ${height}: ${(error as Error).message}`,
      );
      return [];
    }
  }
}

export const mempoolService = new MempoolService();
