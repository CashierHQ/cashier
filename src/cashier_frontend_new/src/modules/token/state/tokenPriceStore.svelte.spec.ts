import { describe, it, expect, vi, beforeEach } from "vitest";
import { Ok, Err } from "ts-results-es";

// Hoist mock functions so they're available inside vi.mock() factory
const { mockGetIcpswapPrices, mockGetIcExplorerPrices } = vi.hoisted(() => ({
  mockGetIcpswapPrices: vi.fn(),
  mockGetIcExplorerPrices: vi.fn(),
}));

vi.mock("../services/token_price/icpswap", () => ({
  icpswapTokenPriceService: { getTokenPrices: mockGetIcpswapPrices },
}));

vi.mock("../services/token_price/icExplorer", () => ({
  icExplorerTokenPriceService: { getTokenPrices: mockGetIcExplorerPrices },
}));

// Hoist queryHolder so it's available when managedState mock executes at module init
const { queryHolder } = vi.hoisted(() => ({
  queryHolder: {
    instance: null as {
      data: Record<string, number> | undefined;
      _invokeQueryFn: () => Promise<Record<string, number>>;
    } | null,
  },
}));

vi.mock("$lib/managedState", () => ({
  managedState: vi
    .fn()
    .mockImplementation(
      (config: { queryFn: () => Promise<Record<string, number>> }) => {
        queryHolder.instance = {
          data: undefined,
          _invokeQueryFn: async () => {
            const result = await config.queryFn();
            queryHolder.instance!.data = result;
            return result;
          },
        };
        return queryHolder.instance;
      },
    ),
}));

// Import store AFTER all mocks are defined
import { tokenPriceStore } from "$modules/token/state/tokenPriceStore.svelte";

describe("TokenPriceStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryHolder.instance!.data = undefined;
  });

  // ─────────────────────────────────────────────────────────────
  // query getter
  // ─────────────────────────────────────────────────────────────

  describe("query getter", () => {
    it("returns the managedState instance", () => {
      // Arrange — store already initialized via module-level managedState mock

      // Act
      const query = tokenPriceStore.query;

      // Assert
      expect(query).toBe(queryHolder.instance!);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getTokenPriceByCanisterId
  // ─────────────────────────────────────────────────────────────

  describe("getTokenPriceByCanisterId", () => {
    it("returns null when data not yet loaded", () => {
      // Arrange
      queryHolder.instance!.data = undefined;

      // Act
      const price = tokenPriceStore.getTokenPriceByCanisterId(
        "ryjl3-tyaaa-aaaaa-aaaba-cai",
      );

      // Assert
      expect(price).toBeNull();
    });

    it("returns price when token exists in map", () => {
      // Arrange
      queryHolder.instance!.data = { "ryjl3-tyaaa-aaaaa-aaaba-cai": 2.48 };

      // Act
      const price = tokenPriceStore.getTokenPriceByCanisterId(
        "ryjl3-tyaaa-aaaaa-aaaba-cai",
      );

      // Assert
      expect(price).toBeCloseTo(2.48);
    });

    it("returns null for unknown canister id", () => {
      // Arrange
      queryHolder.instance!.data = { "known-token": 1.0 };

      // Act
      const price = tokenPriceStore.getTokenPriceByCanisterId("unknown-token");

      // Assert
      expect(price).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // queryFn — price merging logic
  // ─────────────────────────────────────────────────────────────

  describe("queryFn — price merging", () => {
    it("merges prices from both services into single map", async () => {
      // Arrange
      mockGetIcpswapPrices.mockResolvedValueOnce(
        Ok({ "token-a": 1.0, "token-b": 2.0 }),
      );
      mockGetIcExplorerPrices.mockResolvedValueOnce(Ok({ "token-c": 3.0 }));

      // Act
      const prices = await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(prices["token-a"]).toBeCloseTo(1.0);
      expect(prices["token-b"]).toBeCloseTo(2.0);
      expect(prices["token-c"]).toBeCloseTo(3.0);
    });

    it("icpswap overrides icExplorer for same token (priority: icpswap > icExplorer)", async () => {
      mockGetIcpswapPrices.mockResolvedValueOnce(
        Ok({ "ryjl3-tyaaa-aaaaa-aaaba-cai": 2.47 }),
      );
      mockGetIcExplorerPrices.mockResolvedValueOnce(
        Ok({ "ryjl3-tyaaa-aaaaa-aaaba-cai": 2.48 }),
      );

      // Act
      const prices = await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(prices["ryjl3-tyaaa-aaaaa-aaaba-cai"]).toBeCloseTo(2.47);
    });

    it("returns icExplorer prices when icpswap returns Err", async () => {
      // Arrange
      mockGetIcpswapPrices.mockResolvedValueOnce(
        Err(new Error("ICPSwap down")),
      );
      mockGetIcExplorerPrices.mockResolvedValueOnce(Ok({ "token-a": 1.5 }));

      // Act
      const prices = await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(prices["token-a"]).toBeCloseTo(1.5);
    });

    it("returns icpswap prices when icExplorer returns Err", async () => {
      // Arrange
      mockGetIcpswapPrices.mockResolvedValueOnce(Ok({ "token-a": 2.0 }));
      mockGetIcExplorerPrices.mockResolvedValueOnce(
        Err(new Error("Explorer down")),
      );

      // Act
      const prices = await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(prices["token-a"]).toBeCloseTo(2.0);
    });

    it("returns empty object when both services return Err", async () => {
      // Arrange
      mockGetIcpswapPrices.mockResolvedValueOnce(
        Err(new Error("ICPSwap down")),
      );
      mockGetIcExplorerPrices.mockResolvedValueOnce(
        Err(new Error("Explorer down")),
      );

      // Act
      const prices = await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(prices).toEqual({});
    });

    it("handles rejected promise from icpswap without throwing", async () => {
      // Arrange
      mockGetIcpswapPrices.mockRejectedValueOnce(new Error("Uncaught error"));
      mockGetIcExplorerPrices.mockResolvedValueOnce(Ok({ "token-a": 1.0 }));

      // Act — Promise.allSettled handles rejections gracefully, should not throw
      const prices = await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(prices["token-a"]).toBeCloseTo(1.0);
    });

    it("calls both services regardless of order", async () => {
      // Arrange
      mockGetIcpswapPrices.mockResolvedValueOnce(Ok({}));
      mockGetIcExplorerPrices.mockResolvedValueOnce(Ok({}));

      // Act
      await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(mockGetIcpswapPrices).toHaveBeenCalledTimes(1);
      expect(mockGetIcExplorerPrices).toHaveBeenCalledTimes(1);
    });
  });
});
