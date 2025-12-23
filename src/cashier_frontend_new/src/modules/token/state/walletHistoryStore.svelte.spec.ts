import { describe, it, expect, vi, beforeEach } from "vitest";
import { Ok, Err } from "ts-results-es";
import type { TokenTransaction } from "../types";

// Constants for tests
const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const ICRC_TOKEN_ADDRESS = "mxzaz-hqaaa-aaaar-qaada-cai";
const ICRC_INDEX_CANISTER_ID = "n5wcd-faaaa-aaaar-qaaea-cai";

// Mock constants
vi.mock("../constants", () => ({
  ICP_LEDGER_CANISTER_ID: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  ICP_INDEX_CANISTER_ID: "qhbym-qaaaa-aaaaa-aaafq-cai",
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

// Mock walletStore.findTokenByAddress
const mockFindTokenByAddress = vi.fn();
vi.mock("./walletStore.svelte", () => ({
  walletStore: {
    findTokenByAddress: (address: string) => mockFindTokenByAddress(address),
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
  // Capture queryFn so tests can invoke it to populate initial data
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

// Import store after mocks are set up (vi.mock is hoisted)
import { walletHistoryStore } from "./walletHistoryStore.svelte";

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAccount = { owner: "aaaaa-aa" };
    managedStateCallCount = 0;
    mockQueryInstances.length = 0;
    walletHistoryStore.clearAll();
  });

  describe("load", () => {
    it("should set currentTokenAddress when loading ICP token", () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      expect(walletHistoryStore.currentTokenAddress).toBe(
        ICP_LEDGER_CANISTER_ID,
      );
    });

    it("should create new state for ICP token (uses ICP_INDEX_CANISTER_ID)", () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      expect(managedStateCallCount).toBe(1);
    });

    it("should create new state for ICRC token with valid indexId", () => {
      mockFindTokenByAddress.mockReturnValue(
        Ok({ indexId: ICRC_INDEX_CANISTER_ID }),
      );

      walletHistoryStore.load(ICRC_TOKEN_ADDRESS);

      expect(mockFindTokenByAddress).toHaveBeenCalledWith(ICRC_TOKEN_ADDRESS);
      expect(managedStateCallCount).toBe(1);
    });

    it("should not create state for token without indexId", () => {
      mockFindTokenByAddress.mockReturnValue(Err(new Error("Not found")));

      walletHistoryStore.load(ICRC_TOKEN_ADDRESS);

      expect(walletHistoryStore.currentTokenAddress).toBe(ICRC_TOKEN_ADDRESS);
      expect(walletHistoryStore.transactions).toEqual([]);
    });

    it("should reuse existing state when loading same token again", () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);
      const firstCallCount = managedStateCallCount;

      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      expect(managedStateCallCount).toBe(firstCallCount);
    });
  });

  describe("loadMore", () => {
    it("should do nothing if no current token", async () => {
      await walletHistoryStore.loadMore();

      expect(mockGetTransactions).not.toHaveBeenCalled();
    });

    it("should do nothing if no auth account", async () => {
      mockAuthAccount = null;
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      await walletHistoryStore.loadMore();

      expect(mockGetTransactions).not.toHaveBeenCalled();
    });

    it("should do nothing if token has no indexId", async () => {
      mockFindTokenByAddress.mockReturnValue(Err(new Error("Not found")));
      walletHistoryStore.load(ICRC_TOKEN_ADDRESS);

      await walletHistoryStore.loadMore();

      expect(mockGetTransactions).not.toHaveBeenCalled();
    });

    it("should do nothing if transactions array is empty", async () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      await walletHistoryStore.loadMore();

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

        // Load token and trigger initial fetch via queryFn
        walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);
        if (mockQueryInstances.length > 0) {
          await mockQueryInstances[0]._invokeQueryFn();
        }
      });

      it("should fetch more transactions with oldest txId as cursor", async () => {
        // Setup: loadMore will return older transactions
        const olderTxs = [createMockTx(10n), createMockTx(9n)];
        mockGetTransactions.mockResolvedValueOnce({
          transactions: olderTxs,
          balance: 1000n,
        });

        await walletHistoryStore.loadMore();

        // Should call getTransactions with start = oldest existing txId (11n)
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

        await walletHistoryStore.loadMore();

        // Should have 12 transactions total (10 initial + 2 new)
        expect(walletHistoryStore.transactions).toHaveLength(12);
        // Should be sorted newest first
        expect(walletHistoryStore.transactions[0].id).toBe(20n);
        expect(walletHistoryStore.transactions[11].id).toBe(9n);
      });

      it("should set hasMore to false when no new transactions returned", async () => {
        // Return empty array (no more transactions)
        mockGetTransactions.mockResolvedValueOnce({
          transactions: [],
          balance: 1000n,
        });

        await walletHistoryStore.loadMore();

        expect(walletHistoryStore.hasMore).toBe(false);
      });

      it("should set hasMore to true when new transactions are returned", async () => {
        mockGetTransactions.mockResolvedValueOnce({
          transactions: [createMockTx(10n)],
          balance: 1000n,
        });

        await walletHistoryStore.loadMore();

        expect(walletHistoryStore.hasMore).toBe(true);
      });

      it("should handle duplicate transactions in response", async () => {
        // Return mix of existing (11n) and new (10n) transactions
        mockGetTransactions.mockResolvedValueOnce({
          transactions: [createMockTx(11n), createMockTx(10n)],
          balance: 1000n,
        });

        await walletHistoryStore.loadMore();

        // Should only add 1 new transaction (10n), not duplicate 11n
        expect(walletHistoryStore.transactions).toHaveLength(11);
      });

      it("should set isLoadingMore during fetch", async () => {
        let loadingDuringFetch = false;
        mockGetTransactions.mockImplementationOnce(async () => {
          loadingDuringFetch = walletHistoryStore.isLoadingMore;
          return { transactions: [], balance: 1000n };
        });

        await walletHistoryStore.loadMore();

        expect(loadingDuringFetch).toBe(true);
        expect(walletHistoryStore.isLoadingMore).toBe(false);
      });

      it("should handle fetch error gracefully", async () => {
        mockGetTransactions.mockRejectedValueOnce(new Error("Network error"));

        // Should not throw
        await expect(walletHistoryStore.loadMore()).resolves.not.toThrow();

        // Original transactions should remain (10 initial)
        expect(walletHistoryStore.transactions).toHaveLength(10);
        expect(walletHistoryStore.isLoadingMore).toBe(false);
      });
    });
  });

  describe("clear", () => {
    it("should clear currentTokenAddress", () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);
      expect(walletHistoryStore.currentTokenAddress).toBe(
        ICP_LEDGER_CANISTER_ID,
      );

      walletHistoryStore.clear();

      expect(walletHistoryStore.currentTokenAddress).toBeNull();
    });

    it("should preserve history after clear (can reload same token)", () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);
      const stateCountAfterLoad = managedStateCallCount;

      walletHistoryStore.clear();
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      expect(managedStateCallCount).toBe(stateCountAfterLoad);
    });
  });

  describe("clearAll", () => {
    it("should clear currentTokenAddress", () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      walletHistoryStore.clearAll();

      expect(walletHistoryStore.currentTokenAddress).toBeNull();
    });

    it("should clear all histories (forces new state on reload)", () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);
      const stateCountAfterLoad = managedStateCallCount;

      walletHistoryStore.clearAll();
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      expect(managedStateCallCount).toBe(stateCountAfterLoad + 1);
    });
  });

  describe("getters", () => {
    describe("when no current token", () => {
      it("transactions should return empty array", () => {
        expect(walletHistoryStore.transactions).toEqual([]);
      });

      it("isLoading should return false", () => {
        expect(walletHistoryStore.isLoading).toBe(false);
      });

      it("isLoadingMore should return false", () => {
        expect(walletHistoryStore.isLoadingMore).toBe(false);
      });

      it("hasMore should return false", () => {
        expect(walletHistoryStore.hasMore).toBe(false);
      });

      it("error should return undefined", () => {
        expect(walletHistoryStore.error).toBeUndefined();
      });

      it("currentTokenAddress should return null", () => {
        expect(walletHistoryStore.currentTokenAddress).toBeNull();
      });
    });

    describe("when token is loaded", () => {
      beforeEach(() => {
        walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);
      });

      it("currentTokenAddress should return loaded address", () => {
        expect(walletHistoryStore.currentTokenAddress).toBe(
          ICP_LEDGER_CANISTER_ID,
        );
      });

      it("isLoading should reflect query.isLoading state", () => {
        expect(walletHistoryStore.isLoading).toBe(false);

        if (mockQueryInstances.length > 0) {
          mockQueryInstances[0].isLoading = true;
        }
        expect(walletHistoryStore.isLoading).toBe(true);
      });

      it("error should reflect query.error state", () => {
        expect(walletHistoryStore.error).toBeUndefined();

        const testError = new Error("Test error");
        if (mockQueryInstances.length > 0) {
          mockQueryInstances[0].error = testError;
        }
        expect(walletHistoryStore.error).toBe(testError);
      });

      it("hasMore should return true initially", () => {
        expect(walletHistoryStore.hasMore).toBe(true);
      });
    });
  });

  describe("multiple tokens", () => {
    it("should maintain separate state for different tokens", () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);
      const icpStateCount = managedStateCallCount;

      mockFindTokenByAddress.mockReturnValue(
        Ok({ indexId: ICRC_INDEX_CANISTER_ID }),
      );
      walletHistoryStore.load(ICRC_TOKEN_ADDRESS);

      expect(managedStateCallCount).toBe(icpStateCount + 1);
      expect(walletHistoryStore.currentTokenAddress).toBe(ICRC_TOKEN_ADDRESS);
    });

    it("should switch between tokens without losing state", () => {
      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      mockFindTokenByAddress.mockReturnValue(
        Ok({ indexId: ICRC_INDEX_CANISTER_ID }),
      );
      walletHistoryStore.load(ICRC_TOKEN_ADDRESS);
      const totalStates = managedStateCallCount;

      walletHistoryStore.load(ICP_LEDGER_CANISTER_ID);

      expect(managedStateCallCount).toBe(totalStates);
      expect(walletHistoryStore.currentTokenAddress).toBe(
        ICP_LEDGER_CANISTER_ID,
      );
    });
  });
});
