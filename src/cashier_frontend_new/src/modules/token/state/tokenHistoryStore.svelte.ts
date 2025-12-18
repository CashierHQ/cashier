import { managedState } from "$lib/managedState";
import type { ManagedState } from "$lib/managedState/managedState.svelte";
import { tokenHistoryService } from "../services/tokenHistory";
import type {
  TokenTransaction,
  IcrcAccount,
  GetTransactionsResult,
} from "../types";

const DEFAULT_PAGE_SIZE = BigInt(20);

/**
 * Paginated token history store using managedState
 * - managedState handles initial fetch (loading/error/data)
 * - Manual $state handles pagination (loadMore results)
 */
export class TokenHistoryStore {
  #query: ManagedState<GetTransactionsResult>;

  // Pagination state (for loadMore results only)
  #paginatedTransactions = $state<TokenTransaction[]>([]);
  #isLoadingMore = $state(false);
  #hasMore = $state(true);

  #indexId: string;
  #account: IcrcAccount;
  #pageSize: bigint;

  constructor(
    indexId: string,
    account: IcrcAccount,
    pageSize: bigint = DEFAULT_PAGE_SIZE,
  ) {
    this.#indexId = indexId;
    this.#account = account;
    this.#pageSize = pageSize;

    // managedState auto-fetches on construction
    this.#query = managedState<GetTransactionsResult>({
      queryFn: async () => {
        const res = await tokenHistoryService.getTransactions(this.#indexId, {
          account: this.#account,
          maxResults: this.#pageSize,
        });

        console.log("Fetched token transactions:", res);

        return res;
      },
      staleTime: 60_000, // 1 minute
    });
  }

  /** Access to underlying managedState query */
  get query(): ManagedState<GetTransactionsResult> {
    return this.#query;
  }

  /** All transactions (initial + paginated) */
  get transactions(): TokenTransaction[] {
    const initial = this.#query.data?.transactions ?? [];
    return [...initial, ...this.#paginatedTransactions];
  }

  /** Loading state for initial fetch */
  get isLoading(): boolean {
    return this.#query.isLoading;
  }

  /** Loading state for pagination */
  get isLoadingMore(): boolean {
    return this.#isLoadingMore;
  }

  /** Error from initial fetch */
  get error(): unknown | undefined {
    return this.#query.error;
  }

  /** Whether more transactions can be loaded */
  get hasMore(): boolean {
    const initial = this.#query.data?.transactions ?? [];
    if (initial.length === 0) return false;
    return this.#hasMore;
  }

  /**
   * Load more transactions (pagination)
   */
  async loadMore(): Promise<void> {
    if (this.#isLoadingMore || !this.hasMore || this.#query.isLoading) return;

    // Get cursor from last transaction
    const allTx = this.transactions;
    const lastTx = allTx[allTx.length - 1];
    if (!lastTx || lastTx.id <= BigInt(0)) return;

    this.#isLoadingMore = true;

    try {
      const result = await tokenHistoryService.getTransactions(this.#indexId, {
        account: this.#account,
        maxResults: this.#pageSize,
        start: lastTx.id - BigInt(1),
      });

      if (result.transactions.length === 0) {
        this.#hasMore = false;
      } else {
        this.#paginatedTransactions = [
          ...this.#paginatedTransactions,
          ...result.transactions,
        ];
        this.#hasMore = result.transactions.length >= Number(this.#pageSize);
      }
    } catch (e) {
      console.error("Error loading more transactions:", e);
    } finally {
      this.#isLoadingMore = false;
    }
  }

  /**
   * Reset pagination and refetch from beginning
   */
  refresh(): void {
    this.#paginatedTransactions = [];
    this.#hasMore = true;
    this.#query.refresh();
  }
}

/**
 * Create a token history store instance
 * @param indexId Index canister principal
 * @param account User account to query
 * @param pageSize Number of transactions per page (default: 20)
 */
export function createTokenHistoryStore(
  indexId: string,
  account: IcrcAccount,
  pageSize: bigint = DEFAULT_PAGE_SIZE,
): TokenHistoryStore {
  return new TokenHistoryStore(indexId, account, pageSize);
}
