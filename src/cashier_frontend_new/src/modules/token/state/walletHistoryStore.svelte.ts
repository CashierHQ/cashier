import { managedState, type ManagedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { Principal } from "@dfinity/principal";
import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { TokenIndexService } from "../services/tokenIndexService";
import {
  DEFAULT_TX_PAGE_SIZE,
  TX_STALE_TIME_MS,
  TX_REFETCH_INTERVAL_MS,
} from "../constants";
import type { TokenTransaction, GetTransactionsResult } from "../types";

// Cache stores by indexId to preserve transaction history across token switches
const storeCache = new SvelteMap<string, WalletHistoryStore>();

/**
 * Store for managing single-token transaction history.
 * IndexId passed via constructor - breaks walletStore dependency.
 * Implements stale-while-revalidate: shows cached data immediately, refreshes in background.
 */
class WalletHistoryStore {
  readonly #indexId: string;
  #query: ManagedState<GetTransactionsResult>;
  #transactions = $state<TokenTransaction[]>([]);
  #hasMore = $state(true);
  #isLoadingMore = $state(false);

  constructor(indexId: string) {
    this.#indexId = indexId;
    this.#query = managedState<GetTransactionsResult>({
      queryFn: () => this.#fetchTransactions(),
      staleTime: TX_STALE_TIME_MS,
      refetchInterval: TX_REFETCH_INTERVAL_MS,
    });
  }

  /**
   * Fetch transactions (used by managedState queryFn)
   * Merges new transactions with existing cache to preserve pagination progress
   */
  async #fetchTransactions(): Promise<GetTransactionsResult> {
    const account = authState.account;
    if (!account) {
      return { transactions: [], balance: 0n };
    }

    const service = new TokenIndexService(Principal.fromText(this.#indexId));
    const result = await service.getTransactions({
      account: { owner: account.owner },
      maxResults: DEFAULT_TX_PAGE_SIZE,
    });

    // Merge new transactions with existing (preserve pagination progress)
    const existingIds = new SvelteSet(this.#transactions.map((tx) => tx.id));
    const newTxs = result.transactions.filter((tx) => !existingIds.has(tx.id));

    if (this.#transactions.length === 0) {
      // Initial load: just set the transactions
      this.#transactions = result.transactions;
    } else if (newTxs.length > 0) {
      // Refresh with new transactions: merge and sort
      this.#transactions = [...newTxs, ...this.#transactions].sort((a, b) =>
        Number(b.id - a.id),
      );
    }

    // Only update hasMore on initial load (empty state)
    if (this.#transactions.length <= result.transactions.length) {
      this.#hasMore =
        result.transactions.length >= Number(DEFAULT_TX_PAGE_SIZE);
    }

    return result;
  }

  /**
   * Load more transactions (pagination)
   * Uses oldest transaction ID as cursor for next page
   */
  async loadMore(): Promise<void> {
    if (this.#isLoadingMore || !this.#hasMore) return;
    if (this.#transactions.length === 0) return;

    const account = authState.account;
    if (!account) return;

    this.#isLoadingMore = true;

    try {
      // Find oldest transaction ID to use as cursor
      const oldestTxId = this.#transactions.reduce(
        (min, tx) => (tx.id < min ? tx.id : min),
        this.#transactions[0].id,
      );

      const service = new TokenIndexService(Principal.fromText(this.#indexId));
      const result = await service.getTransactions({
        account: { owner: account.owner },
        start: oldestTxId,
        maxResults: DEFAULT_TX_PAGE_SIZE,
      });

      // Merge new transactions, avoiding duplicates
      const existingIds = new SvelteSet(this.#transactions.map((tx) => tx.id));
      const newTxs = result.transactions.filter(
        (tx) => !existingIds.has(tx.id),
      );
      this.#transactions = [...this.#transactions, ...newTxs].sort((a, b) =>
        Number(b.id - a.id),
      );
      this.#hasMore = newTxs.length > 0;
    } catch (e) {
      console.error("Failed to load more transactions:", e);
    } finally {
      this.#isLoadingMore = false;
    }
  }

  /**
   * Reset store state (e.g., on logout or token change)
   */
  reset(): void {
    this.#transactions = [];
    this.#hasMore = true;
    this.#isLoadingMore = false;
    this.#query.reset();
  }

  /**
   * Manually trigger a refresh of transaction data
   */
  refresh(): void {
    this.#query.refresh();
  }

  // Getters
  get transactions(): TokenTransaction[] {
    return this.#transactions;
  }

  get isLoading(): boolean {
    return this.#query.isLoading;
  }

  get isLoadingMore(): boolean {
    return this.#isLoadingMore;
  }

  get hasMore(): boolean {
    return this.#hasMore;
  }

  get error(): unknown {
    return this.#query.error;
  }

  get indexId(): string {
    return this.#indexId;
  }
}

/**
 * Factory function to get or create a WalletHistoryStore for a single token.
 * Uses cache to preserve transaction history across token switches (prevents flickering).
 * @param indexId - Index canister ID for the token
 * @example
 * const store = createWalletHistoryStore("qhbym-qaaaa-aaaaa-aaafq-cai");
 * await store.loadMore();
 * console.log(store.transactions);
 */
export function createWalletHistoryStore(indexId: string): WalletHistoryStore {
  let store = storeCache.get(indexId);
  if (!store) {
    store = new WalletHistoryStore(indexId);
    storeCache.set(indexId, store);
  }
  return store;
}

/**
 * Clear all cached stores (e.g., on logout)
 */
export function clearWalletHistoryCache(): void {
  storeCache.forEach((store) => store.reset());
  storeCache.clear();
}

export { WalletHistoryStore };
