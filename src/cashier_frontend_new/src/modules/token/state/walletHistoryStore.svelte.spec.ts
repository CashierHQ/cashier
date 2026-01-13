import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TokenTransaction } from "../types";

// Constants for tests
const TEST_INDEX_ID = "qhbym-qaaaa-aaaaa-aaafq-cai";

// Mock constants
vi.mock("../constants", () => ({
  DEFAULT_TX_PAGE_SIZE: 10n,
  TX_STALE_TIME_MS: 30000,
  TX_REFETCH_INTERVAL_MS: 30000,
}));

// Mock authState - mutable for test control
let mockAuthAccount: { owner: string } | null = { owner: "aaaaa-aa" };
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    get account() {
      return mockAuthAccount;
    },
  },
}));

// Mock TokenIndexService
const mockGetTransactions = vi.fn();
vi.mock("../services/tokenIndexService", () => ({
  TokenIndexService: vi.fn().mockImplementation(() => ({
    getTransactions: mockGetTransactions,
  })),
}));

// Track managedState calls for assertions
let managedStateCallCount = 0;
type MockQueryInstance = {
  isLoading: boolean;
  error: unknown;
  refresh: () => void;
  reset: () => void;
  _queryFn?: () => Promise<unknown>;
  _invokeQueryFn: () => Promise<void>;
};
const mockQueryInstances: MockQueryInstance[] = [];

vi.mock("$lib/managedState", () => ({
  managedState: vi
    .fn()
    .mockImplementation((config: { queryFn: () => Promise<unknown> }) => {
      managedStateCallCount++;
      const instance: MockQueryInstance = {
        isLoading: false,
        error: undefined,
        refresh: vi.fn(),
        reset: vi.fn(),
        _queryFn: config.queryFn,
        _invokeQueryFn: async () => {
          if (config.queryFn) {
            await config.queryFn();
          }
        },
      };
      mockQueryInstances.push(instance);
      return instance;
    }),
}));

// Import store after mocks
import {
  getWalletHistoryStore,
  clearWalletHistoryCache,
  WalletHistoryStore,
} from "./walletHistoryStore.svelte";

// Helper to create mock transactions
const createMockTx = (
  id: bigint,
  timestampMs = Date.now(),
): TokenTransaction => ({
  id,
  kind: "transfer",
  amount: 100n,
  timestampMs,
  from: "from-principal",
  to: "to-principal",
});

describe("WalletHistoryStore", () => {
  let store: WalletHistoryStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAccount = { owner: "aaaaa-aa" };
    managedStateCallCount = 0;
    mockQueryInstances.length = 0;
    clearWalletHistoryCache(); // Clear cache between tests
    store = getWalletHistoryStore(TEST_INDEX_ID);
  });

  describe("constructor", () => {
    it("should create managedState", () => {
      expect(managedStateCallCount).toBe(1);
    });

    it("should store indexId", () => {
      expect(store.indexId).toBe(TEST_INDEX_ID);
    });
  });

  describe("factory function", () => {
    it("should create new instance for new indexId", () => {
      const newStore = getWalletHistoryStore("different-index-id");
      expect(newStore).toBeInstanceOf(WalletHistoryStore);
      expect(newStore.indexId).toBe("different-index-id");
    });

    it("should return cached instance for same indexId", () => {
      const initialCount = managedStateCallCount;
      const sameStore = getWalletHistoryStore(TEST_INDEX_ID);

      expect(sameStore).toBe(store);
      expect(managedStateCallCount).toBe(initialCount); // No new managedState created
    });

    it("should create separate instances for different indexIds", () => {
      const store1 = getWalletHistoryStore("index-1");
      const store2 = getWalletHistoryStore("index-2");

      expect(store1).not.toBe(store2);
      expect(store1.indexId).toBe("index-1");
      expect(store2.indexId).toBe("index-2");
    });
  });

  describe("clearWalletHistoryCache", () => {
    it("should reset all cached stores", async () => {
      // Populate store with transactions
      mockGetTransactions.mockResolvedValueOnce({
        transactions: [createMockTx(1n)],
        balance: 1000n,
      });
      await mockQueryInstances[0]._invokeQueryFn();
      expect(store.transactions.length).toBeGreaterThan(0);

      clearWalletHistoryCache();

      // Store should be reset
      expect(store.transactions).toEqual([]);
      expect(store.hasMore).toBe(true);
    });

    it("should clear cache so new stores are created", () => {
      const initialCount = managedStateCallCount;

      clearWalletHistoryCache();
      const newStore = getWalletHistoryStore(TEST_INDEX_ID);

      expect(newStore).not.toBe(store);
      expect(managedStateCallCount).toBe(initialCount + 1); // New managedState created
    });

    it("should reset multiple stores", async () => {
      // Use valid principal format for second store
      const store2 = getWalletHistoryStore("ryjl3-tyaaa-aaaaa-aaaba-cai");

      // Populate both stores
      mockGetTransactions
        .mockResolvedValueOnce({
          transactions: [createMockTx(1n)],
          balance: 1000n,
        })
        .mockResolvedValueOnce({
          transactions: [createMockTx(2n)],
          balance: 2000n,
        });

      await mockQueryInstances[0]._invokeQueryFn();
      await mockQueryInstances[1]._invokeQueryFn();

      expect(store.transactions.length).toBeGreaterThan(0);
      expect(store2.transactions.length).toBeGreaterThan(0);

      clearWalletHistoryCache();

      expect(store.transactions).toEqual([]);
      expect(store2.transactions).toEqual([]);
    });
  });

  describe("loadMore", () => {
    it("should do nothing if no auth account", async () => {
      mockAuthAccount = null;

      await store.loadMore();

      expect(mockGetTransactions).not.toHaveBeenCalled();
    });

    it("should do nothing if transactions array is empty", async () => {
      await store.loadMore();

      expect(mockGetTransactions).not.toHaveBeenCalled();
    });

    describe("when transactions exist", () => {
      // Need 10+ transactions to trigger hasMore=true (DEFAULT_TX_PAGE_SIZE is 10)
      const initialTxs = Array.from({ length: 10 }, (_, i) =>
        createMockTx(BigInt(20 - i)),
      ); // IDs: 20, 19, 18, ..., 11

      beforeEach(async () => {
        // Setup: mock initial fetch to return transactions
        mockGetTransactions.mockResolvedValueOnce({
          transactions: initialTxs,
          balance: 1000n,
        });

        // Trigger initial fetch via queryFn
        if (mockQueryInstances.length > 0) {
          await mockQueryInstances[0]._invokeQueryFn();
        }
      });

      it("should fetch more transactions with oldest txId as cursor", async () => {
        const olderTxs = [createMockTx(10n), createMockTx(9n)];
        mockGetTransactions.mockResolvedValueOnce({
          transactions: olderTxs,
          balance: 1000n,
        });

        await store.loadMore();

        expect(mockGetTransactions).toHaveBeenLastCalledWith(
          expect.objectContaining({
            start: 11n,
          }),
        );
      });

      it("should merge new transactions without duplicates", async () => {
        const olderTxs = [createMockTx(10n), createMockTx(9n)];
        mockGetTransactions.mockResolvedValueOnce({
          transactions: olderTxs,
          balance: 1000n,
        });

        await store.loadMore();

        expect(store.transactions).toHaveLength(12);
        expect(store.transactions[0].id).toBe(20n);
        expect(store.transactions[11].id).toBe(9n);
      });

      it("should set hasMore to false when no new transactions returned", async () => {
        mockGetTransactions.mockResolvedValueOnce({
          transactions: [],
          balance: 1000n,
        });

        await store.loadMore();

        expect(store.hasMore).toBe(false);
      });

      it("should set hasMore to true when new transactions are returned", async () => {
        mockGetTransactions.mockResolvedValueOnce({
          transactions: [createMockTx(10n)],
          balance: 1000n,
        });

        await store.loadMore();

        expect(store.hasMore).toBe(true);
      });

      it("should handle duplicate transactions in response", async () => {
        mockGetTransactions.mockResolvedValueOnce({
          transactions: [createMockTx(11n), createMockTx(10n)],
          balance: 1000n,
        });

        await store.loadMore();

        expect(store.transactions).toHaveLength(11);
      });

      it("should set isLoadingMore during fetch", async () => {
        let loadingDuringFetch = false;
        mockGetTransactions.mockImplementationOnce(async () => {
          loadingDuringFetch = store.isLoadingMore;
          return { transactions: [], balance: 1000n };
        });

        await store.loadMore();

        expect(loadingDuringFetch).toBe(true);
        expect(store.isLoadingMore).toBe(false);
      });

      it("should handle fetch error gracefully", async () => {
        mockGetTransactions.mockRejectedValueOnce(new Error("Network error"));

        await expect(store.loadMore()).resolves.not.toThrow();

        expect(store.transactions).toHaveLength(10);
        expect(store.isLoadingMore).toBe(false);
      });
    });
  });

  describe("reset", () => {
    it("should clear transactions", async () => {
      // Populate transactions first
      mockGetTransactions.mockResolvedValueOnce({
        transactions: [createMockTx(1n)],
        balance: 1000n,
      });
      await mockQueryInstances[0]._invokeQueryFn();
      expect(store.transactions.length).toBeGreaterThan(0);

      store.reset();

      expect(store.transactions).toEqual([]);
    });

    it("should reset hasMore to true", async () => {
      mockGetTransactions.mockResolvedValueOnce({
        transactions: [],
        balance: 1000n,
      });
      await mockQueryInstances[0]._invokeQueryFn();

      store.reset();

      expect(store.hasMore).toBe(true);
    });

    it("should call query.reset", () => {
      store.reset();

      expect(mockQueryInstances[0].reset).toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("should call query.refresh", () => {
      store.refresh();

      expect(mockQueryInstances[0].refresh).toHaveBeenCalled();
    });
  });

  describe("getters", () => {
    it("transactions should return empty array initially", () => {
      expect(store.transactions).toEqual([]);
    });

    it("isLoading should reflect query.isLoading", () => {
      expect(store.isLoading).toBe(false);

      mockQueryInstances[0].isLoading = true;
      expect(store.isLoading).toBe(true);
    });

    it("isLoadingMore should return false initially", () => {
      expect(store.isLoadingMore).toBe(false);
    });

    it("hasMore should return true initially", () => {
      expect(store.hasMore).toBe(true);
    });

    it("error should reflect query.error", () => {
      expect(store.error).toBeUndefined();

      const testError = new Error("Test error");
      mockQueryInstances[0].error = testError;
      expect(store.error).toBe(testError);
    });

    it("indexId should return constructor value", () => {
      expect(store.indexId).toBe(TEST_INDEX_ID);
    });
  });
});
