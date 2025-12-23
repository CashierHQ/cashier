import { managedState, type ManagedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { Principal } from "@dfinity/principal";
import { TokenIndexService } from "../services/tokenIndexService";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_INDEX_CANISTER_ID,
  DEFAULT_TX_PAGE_SIZE,
  TX_STALE_TIME_MS,
  TX_REFETCH_INTERVAL_MS,
} from "../constants";
import type { TokenTransaction, GetTransactionsResult } from "../types";
import { walletStore } from "./walletStore.svelte";
import { SvelteMap } from "svelte/reactivity";

/**
 * Per-token history state with caching support
 * Using $state for reactive properties
 */
class TokenHistoryState {
  query: ManagedState<GetTransactionsResult>;
  transactions = $state<TokenTransaction[]>([]);
  hasMore = $state(true);
  isLoadingMore = $state(false);

  constructor(query: ManagedState<GetTransactionsResult>) {
    this.query = query;
  }
}

/**
 * Store for managing token transaction history with per-token caching.
 * Implements stale-while-revalidate: shows cached data immediately, refreshes in background.
 */
class WalletHistoryStore {
  // Current token address being viewed
  #currentTokenAddress = $state<string | null>(null);

  // Per-token histories: each token gets its own managed state
  // Using SvelteMap for reactive Map operations
  #histories = new SvelteMap<string, TokenHistoryState>();

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
   * Fetch transactions for a token (used by managedState queryFn)
   * Merges new transactions with existing cache to preserve pagination progress
   */
  async #fetchTransactions(
    tokenAddress: string,
    indexId: string,
  ): Promise<GetTransactionsResult> {
    const account = authState.account;
    if (!account) {
      return { transactions: [], balance: 0n };
    }

    const service = new TokenIndexService(Principal.fromText(indexId));
    const result = await service.getTransactions({
      account: { owner: account.owner },
      maxResults: DEFAULT_TX_PAGE_SIZE,
    });

    // Merge new transactions with existing history (preserve pagination progress)
    const state = this.#histories.get(tokenAddress);
    if (state) {
      // Merge: add new transactions while keeping existing ones
      const existingIds = new Set(state.transactions.map((tx) => tx.id));
      const newTxs = result.transactions.filter(
        (tx) => !existingIds.has(tx.id),
      );

      if (state.transactions.length === 0) {
        // Initial load: just set the transactions
        state.transactions = result.transactions;
      } else if (newTxs.length > 0) {
        // Refresh with new transactions: merge and sort
        state.transactions = [...newTxs, ...state.transactions].sort((a, b) =>
          Number(b.id - a.id),
        );
      }
      // Only update hasMore on initial load (empty state)
      if (state.transactions.length <= result.transactions.length) {
        state.hasMore =
          result.transactions.length >= Number(DEFAULT_TX_PAGE_SIZE);
      }
    }

    return result;
  }

  /**
   * Get or create history state for a token
   */
  #getOrCreateState(tokenAddress: string): TokenHistoryState | null {
    // Return existing history entry
    if (this.#histories.has(tokenAddress)) {
      return this.#histories.get(tokenAddress)!;
    }

    // Get index ID for new token
    const indexId = this.#getIndexId(tokenAddress);
    if (!indexId) {
      return null;
    }

    // Create new state with managedState for this token
    const query = managedState<GetTransactionsResult>({
      queryFn: () => this.#fetchTransactions(tokenAddress, indexId),
      staleTime: TX_STALE_TIME_MS,
      refetchInterval: TX_REFETCH_INTERVAL_MS,
    });

    const state = new TokenHistoryState(query);
    this.#histories.set(tokenAddress, state);
    return state;
  }

  /**
   * Load transaction history for a token.
   * Shows cached data immediately if available, refreshes in background if stale.
   */
  load(tokenAddress: string): void {
    this.#currentTokenAddress = tokenAddress;
    // Create state if not exists, managedState handles stale/refresh logic
    this.#getOrCreateState(tokenAddress);
  }

  /**
   * Load more transactions (pagination) for current token
   * Uses oldest transaction ID as cursor for next page
   */
  async loadMore(): Promise<void> {
    if (!this.#currentTokenAddress) return;

    const state = this.#histories.get(this.#currentTokenAddress);
    if (!state || state.isLoadingMore || !state.hasMore) return;
    if (state.transactions.length === 0) return;

    const account = authState.account;
    if (!account) return;

    const indexId = this.#getIndexId(this.#currentTokenAddress);
    if (!indexId) return;

    state.isLoadingMore = true;

    try {
      // Find oldest transaction ID to use as cursor
      const oldestTxId = state.transactions.reduce(
        (min, tx) => (tx.id < min ? tx.id : min),
        state.transactions[0].id,
      );

      const service = new TokenIndexService(Principal.fromText(indexId));
      const result = await service.getTransactions({
        account: { owner: account.owner },
        start: oldestTxId,
        maxResults: DEFAULT_TX_PAGE_SIZE,
      });

      // Merge new transactions, avoiding duplicates
      const existingIds = new Set(state.transactions.map((tx) => tx.id));
      const newTxs = result.transactions.filter(
        (tx) => !existingIds.has(tx.id),
      );
      state.transactions = [...state.transactions, ...newTxs].sort((a, b) =>
        // id is block number - go by order
        Number(b.id - a.id),
      );
      state.hasMore = newTxs.length > 0;
    } catch (e) {
      console.error("Failed to load more transactions:", e);
    } finally {
      state.isLoadingMore = false;
    }
  }

  /**
   * Clear current token selection (keeps history for future visits)
   */
  clear(): void {
    this.#currentTokenAddress = null;
  }

  /**
   * Clear all history data (e.g., on logout)
   */
  clearAll(): void {
    this.#histories.clear();
    this.#currentTokenAddress = null;
  }

  // Getters - read from current token's history state
  get transactions(): TokenTransaction[] {
    if (!this.#currentTokenAddress) return [];
    return this.#histories.get(this.#currentTokenAddress)?.transactions ?? [];
  }

  get isLoading(): boolean {
    if (!this.#currentTokenAddress) return false;
    return (
      this.#histories.get(this.#currentTokenAddress)?.query.isLoading ?? false
    );
  }

  get isLoadingMore(): boolean {
    if (!this.#currentTokenAddress) return false;
    return (
      this.#histories.get(this.#currentTokenAddress)?.isLoadingMore ?? false
    );
  }

  get hasMore(): boolean {
    if (!this.#currentTokenAddress) return false;
    return this.#histories.get(this.#currentTokenAddress)?.hasMore ?? false;
  }

  get error(): unknown {
    if (!this.#currentTokenAddress) return undefined;
    return this.#histories.get(this.#currentTokenAddress)?.query.error;
  }

  get currentTokenAddress(): string | null {
    return this.#currentTokenAddress;
  }
}

export const walletHistoryStore = new WalletHistoryStore();
