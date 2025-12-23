import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { Principal } from "@dfinity/principal";
import { TokenIndexService } from "../services/tokenIndexService";
import { ICP_LEDGER_CANISTER_ID, ICP_INDEX_CANISTER_ID } from "../constants";
import type { TokenTransaction, GetTransactionsResult } from "../types";
import { walletStore } from "./walletStore.svelte";

const DEFAULT_PAGE_SIZE = 100n;

/**
 * Store for managing token transaction history.
 * Call load(tokenAddress) to fetch history for a specific token.
 */
class WalletHistoryStore {
  // Current token address being viewed
  #currentTokenAddress = $state<string | null>(null);

  // Transaction history query
  #historyQuery;

  // Pagination state
  #hasMore = $state(true);
  #isLoadingMore = $state(false);
  #allTransactions = $state<TokenTransaction[]>([]);

  constructor() {
    this.#historyQuery = managedState<GetTransactionsResult>({
      queryFn: async () => {
        const tokenAddress = this.#currentTokenAddress;
        if (!tokenAddress) {
          return { transactions: [], balance: 0n };
        }

        const account = authState.account;
        if (!account) {
          return { transactions: [], balance: 0n };
        }

        // Get index canister ID: ICP uses special ID, others use token's indexId
        const indexId = this.#getIndexId(tokenAddress);
        console.warn("[walletHistoryStore] queryFn running for token:", tokenAddress, "indexId:", indexId);
        if (!indexId) {
          console.warn("[walletHistoryStore] No indexId found for token:", tokenAddress);
          return { transactions: [], balance: 0n };
        }

        const service = new TokenIndexService(Principal.fromText(indexId));
        const result = await service.getTransactions({
          account: { owner: account.owner },
          maxResults: DEFAULT_PAGE_SIZE,
        });

        console.warn("[walletHistoryStore] Loaded transactions:", result.transactions.length);

        // Update pagination state
        this.#allTransactions = result.transactions;
        this.#hasMore = result.transactions.length >= Number(DEFAULT_PAGE_SIZE);

        return result;
      },
    });
  }

  /**
   * Get index canister ID for a token
   */
  #getIndexId(tokenAddress: string): string | undefined {
    if (tokenAddress === ICP_LEDGER_CANISTER_ID) {
      return ICP_INDEX_CANISTER_ID;
    }
    // For other tokens, get indexId from walletStore
    const tokenResult = walletStore.findTokenByAddress(tokenAddress);
    if (tokenResult.isErr()) return undefined;
    return tokenResult.value.indexId;
  }

  /**
   * Load transaction history for a token
   */
  load(tokenAddress: string): void {
    console.warn("[walletHistoryStore] load() called with:", tokenAddress, "current:", this.#currentTokenAddress);
    // Reset state for new token
    if (this.#currentTokenAddress !== tokenAddress) {
      this.#currentTokenAddress = tokenAddress;
      this.#allTransactions = [];
      this.#hasMore = true;
      console.warn("[walletHistoryStore] Refreshing query for new token");
      this.#historyQuery.refresh();
    }
  }

  /**
   * Load more transactions (pagination)
   */
  async loadMore(): Promise<void> {
    if (!this.#currentTokenAddress || this.#isLoadingMore || !this.#hasMore) return;

    const account = authState.account;
    if (!account) return;

    const indexId = this.#getIndexId(this.#currentTokenAddress);
    if (!indexId) return;

    this.#isLoadingMore = true;

    try {
      const service = new TokenIndexService(Principal.fromText(indexId));
      const result = await service.getTransactions({
        account: { owner: account.owner },
        start: BigInt(this.#allTransactions.length),
        maxResults: DEFAULT_PAGE_SIZE,
      });

      // Merge new transactions, avoiding duplicates
      const existingIds = new Set(this.#allTransactions.map(tx => tx.id));
      const newTxs = result.transactions.filter(tx => !existingIds.has(tx.id));
      this.#allTransactions = [...this.#allTransactions, ...newTxs].sort(
        (a, b) => Number(b.id - a.id)
      );
      this.#hasMore = result.transactions.length >= Number(DEFAULT_PAGE_SIZE);
    } catch (e) {
      console.error("Failed to load more transactions:", e);
    } finally {
      this.#isLoadingMore = false;
    }
  }

  /**
   * Clear history (e.g., when navigating away)
   */
  clear(): void {
    this.#currentTokenAddress = null;
    this.#allTransactions = [];
    this.#hasMore = true;
    this.#historyQuery.reset();
  }

  // Getters
  get query() {
    return this.#historyQuery;
  }

  get transactions(): TokenTransaction[] {
    return this.#allTransactions;
  }

  get isLoading(): boolean {
    return this.#historyQuery.isLoading;
  }

  get isLoadingMore(): boolean {
    return this.#isLoadingMore;
  }

  get hasMore(): boolean {
    return this.#hasMore;
  }

  get error(): unknown {
    return this.#historyQuery.error;
  }

  get currentTokenAddress(): string | null {
    return this.#currentTokenAddress;
  }
}

export const walletHistoryStore = new WalletHistoryStore();
