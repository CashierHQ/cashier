import { MEMPOOL_API_BASE_URL } from "$modules/bitcoin/constants";
import {
  BitcoinTransactionMapper,
  type BitcoinBlock,
  type BitcoinTransaction,
} from "$modules/bitcoin/types/bitcoin_transaction";
import { currentSecondTimestamp } from "$modules/shared/utils/datetimeUtils";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Service for interacting with the Bitcoin Mempool API
 */
class MempoolService {
  #baseUrl: string;

  constructor() {
    this.#baseUrl = MEMPOOL_API_BASE_URL;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
    const transaction = BitcoinTransactionMapper.fromMempoolApiResponse(
      data,
      currentSecondTimestamp(),
    );
    return Ok(transaction);
  }

  /**
   * Get the current tip height of the Bitcoin blockchain.
   * @returns tip height or error message
   */
  async getTipHeight(): Promise<Result<bigint, string>> {
    const response = await fetch(`${this.#baseUrl}/blocks/tip/height`);
    if (!response.ok) {
      return Err(`Failed to fetch tip height: ${response.statusText}`);
    }
    const data: bigint = BigInt(await response.json());
    return Ok(data);
  }

  /**
   * Get block details by height.
   * @param height
   * @returns array of BitcoinBlock or empty array
   */
  async getLatestBlocksFromHeight(
    height: number,
    start_block: number,
  ): Promise<BitcoinBlock[] | []> {
    // fetch latest 15 blocks from height
    const response = await fetch(`${this.#baseUrl}/blocks/${height}`);
    if (!response.ok) {
      console.error(
        `Failed to fetch block at height ${height}: ${response.statusText}`,
      );
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();
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
  }
}

export const mempoolService = new MempoolService();
