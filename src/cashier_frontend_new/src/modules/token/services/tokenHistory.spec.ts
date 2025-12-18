import { describe, expect, it, vi, beforeEach } from "vitest";
import { tokenHistoryService } from "./tokenHistory";
import type { GetTransactionsParams } from "../types";
import { ICP_INDEX_CANISTER_ID } from "../constants";

// Mock IcrcIndexNgCanister
const mockIcrcGetTransactions = vi.fn();
vi.mock("@dfinity/ledger-icrc", () => ({
  IcrcIndexNgCanister: {
    create: vi.fn(() => ({
      getTransactions: mockIcrcGetTransactions,
    })),
  },
}));

// Mock ICP IndexCanister
const mockIcpGetTransactions = vi.fn();
vi.mock("@dfinity/ledger-icp", () => ({
  IndexCanister: {
    create: vi.fn(() => ({
      getTransactions: mockIcpGetTransactions,
    })),
  },
  AccountIdentifier: {
    fromPrincipal: vi.fn(() => ({
      toHex: vi.fn(() => "mock-account-hex"),
    })),
  },
  SubAccount: {
    fromBytes: vi.fn(() => ({})),
  },
}));

// Mock authState
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    buildAnonymousAgent: vi.fn(() => ({})),
  },
}));

describe("tokenHistoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTransactions", () => {
    it("should return empty result when no index id", async () => {
      const params: GetTransactionsParams = {
        account: { owner: "aaaaa-aa" },
      };

      const result = await tokenHistoryService.getTransactions("", params);

      expect(result.transactions).toEqual([]);
      expect(result.balance).toBe(BigInt(0));
    });

    it("should be a singleton instance", () => {
      expect(tokenHistoryService).toBeDefined();
      expect(typeof tokenHistoryService.getTransactions).toBe("function");
    });

    it("should use ICP IndexCanister for ICP index canister ID", async () => {
      mockIcpGetTransactions.mockResolvedValue({
        transactions: [],
        balance: BigInt(1000),
        oldest_tx_id: [],
      });

      const params: GetTransactionsParams = {
        account: { owner: "aaaaa-aa" },
      };

      const result = await tokenHistoryService.getTransactions(
        ICP_INDEX_CANISTER_ID,
        params,
      );

      expect(mockIcpGetTransactions).toHaveBeenCalled();
      expect(mockIcrcGetTransactions).not.toHaveBeenCalled();
      expect(result.balance).toBe(BigInt(1000));
    });

    it("should use ICRC IndexCanister for non-ICP index canister ID", async () => {
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [],
        balance: BigInt(2000),
        oldest_tx_id: [],
      });

      const params: GetTransactionsParams = {
        account: { owner: "aaaaa-aa" },
      };

      // Use a different canister ID (not ICP)
      const result = await tokenHistoryService.getTransactions(
        "2ipq2-uqaaa-aaaar-qailq-cai",
        params,
      );

      expect(mockIcrcGetTransactions).toHaveBeenCalled();
      expect(mockIcpGetTransactions).not.toHaveBeenCalled();
      expect(result.balance).toBe(BigInt(2000));
    });
  });
});
