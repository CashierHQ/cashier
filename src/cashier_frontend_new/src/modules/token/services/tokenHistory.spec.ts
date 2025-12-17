import { describe, expect, it, vi, beforeEach } from "vitest";
import { tokenHistoryService } from "./tokenHistory";
import type { GetTransactionsParams } from "../types";

// Mock @dfinity/ledger-icrc
vi.mock("@dfinity/ledger-icrc", () => ({
  IcrcIndexNgCanister: {
    create: vi.fn(),
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
  });
});
