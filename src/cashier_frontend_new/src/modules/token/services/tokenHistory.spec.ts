import { Principal } from "@dfinity/principal";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  TokenHistoryService,
  createTokenHistoryService,
} from "./tokenHistory";
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

describe("TokenHistoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create service with index canister id", () => {
      const service = new TokenHistoryService("qhbym-qaaaa-aaaar-qaafq-cai");
      expect(service.hasIndex).toBe(true);
    });

    it("should return hasIndex false for empty id", () => {
      const service = new TokenHistoryService("");
      expect(service.hasIndex).toBe(false);
    });
  });

  describe("getTransactions", () => {
    it("should return empty result when no index id", async () => {
      const service = new TokenHistoryService("");
      const params: GetTransactionsParams = {
        account: { owner: "aaaaa-aa" },
      };

      const result = await service.getTransactions(params);

      expect(result.transactions).toEqual([]);
      expect(result.balance).toBe(BigInt(0));
    });
  });

  describe("createTokenHistoryService", () => {
    it("should return null when no indexId provided", () => {
      const service = createTokenHistoryService();
      expect(service).toBeNull();
    });

    it("should return null for empty indexId", () => {
      const service = createTokenHistoryService("");
      expect(service).toBeNull();
    });

    it("should return service instance for valid indexId", () => {
      const service = createTokenHistoryService("qhbym-qaaaa-aaaar-qaafq-cai");
      expect(service).toBeInstanceOf(TokenHistoryService);
    });
  });
});
