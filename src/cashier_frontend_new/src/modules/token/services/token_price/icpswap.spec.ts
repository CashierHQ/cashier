import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock constants before importing service
vi.mock("$modules/token/constants", () => ({
  ICPSWAP_API_BASE_URL: "https://api.icpswap.com",
}));

// Hoist axios mock so it's available in vi.mock factory
const { mockAxiosGet } = vi.hoisted(() => ({
  mockAxiosGet: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    get: mockAxiosGet,
  },
}));

// Import after mocks
import { icpswapTokenPriceService } from "./icpswap";

// Helper: build a valid axios response for ICPSwap token list
const makeResponse = (tokens: { tokenLedgerId: string; price: string }[]) => ({
  data: { code: 200, message: null, data: tokens },
});

describe("IcpswapTokenPriceService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getTokenPrices", () => {
    it("returns price map on success", async () => {
      // Arrange
      mockAxiosGet.mockResolvedValueOnce(
        makeResponse([
          { tokenLedgerId: "ryjl3-tyaaa-aaaaa-aaaba-cai", price: "2.478995" },
          { tokenLedgerId: "cngnf-vqaaa-aaaar-qag4q-cai", price: "1.000000" },
        ]),
      );

      // Act
      const result = await icpswapTokenPriceService.getTokenPrices();

      // Assert
      expect(result.isOk()).toBe(true);
      const map = result.unwrap();
      expect(map["ryjl3-tyaaa-aaaaa-aaaba-cai"]).toBeCloseTo(2.478995);
      expect(map["cngnf-vqaaa-aaaar-qag4q-cai"]).toBeCloseTo(1.0);
    });

    it("uses correct API URL with configured base URL", async () => {
      // Arrange
      mockAxiosGet.mockResolvedValueOnce(makeResponse([]));

      // Act
      await icpswapTokenPriceService.getTokenPrices();

      // Assert
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "https://api.icpswap.com/info/token/all",
        expect.objectContaining({ timeout: 10000 }),
      );
    });

    it("filters out zero-price tokens", async () => {
      // Arrange
      mockAxiosGet.mockResolvedValueOnce(
        makeResponse([
          { tokenLedgerId: "token-zero", price: "0" },
          { tokenLedgerId: "token-valid", price: "5.5" },
        ]),
      );

      // Act
      const result = await icpswapTokenPriceService.getTokenPrices();
      const map = result.unwrap();

      // Assert
      expect("token-zero" in map).toBe(false);
      expect(map["token-valid"]).toBeCloseTo(5.5);
    });

    it("filters out NaN price tokens", async () => {
      // Arrange
      mockAxiosGet.mockResolvedValueOnce(
        makeResponse([
          { tokenLedgerId: "token-nan", price: "not-a-number" },
          { tokenLedgerId: "token-valid", price: "3.14" },
        ]),
      );

      // Act
      const result = await icpswapTokenPriceService.getTokenPrices();
      const map = result.unwrap();

      // Assert
      expect("token-nan" in map).toBe(false);
      expect(map["token-valid"]).toBeCloseTo(3.14);
    });

    it("returns Err when API code is not 200", async () => {
      // Arrange
      mockAxiosGet.mockResolvedValueOnce({
        data: { code: 500, message: "Internal error", data: null },
      });

      // Act
      const result = await icpswapTokenPriceService.getTokenPrices();

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain("ICPSwap API error");
    });

    it("returns Err on network error", async () => {
      // Arrange
      mockAxiosGet.mockRejectedValueOnce(new Error("Network timeout"));

      // Act
      const result = await icpswapTokenPriceService.getTokenPrices();

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain(
        "Failed to fetch prices from ICPSwap",
      );
    });

    it("returns empty map when data array is empty", async () => {
      // Arrange
      mockAxiosGet.mockResolvedValueOnce(makeResponse([]));

      // Act
      const result = await icpswapTokenPriceService.getTokenPrices();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual({});
    });

    it("rounds price to 7 decimal places", async () => {
      // Arrange
      mockAxiosGet.mockResolvedValueOnce(
        makeResponse([
          { tokenLedgerId: "token-a", price: "1.123456789012345" },
        ]),
      );

      // Act
      const result = await icpswapTokenPriceService.getTokenPrices();
      const map = result.unwrap();

      // Assert — toFixed(7) rounds 1.123456789... → 1.1234568
      expect(map["token-a"]).toBeCloseTo(1.1234568, 7);
    });

    it("filters out negative price tokens", async () => {
      // Arrange
      mockAxiosGet.mockResolvedValueOnce(
        makeResponse([
          { tokenLedgerId: "token-neg", price: "-1.5" },
          { tokenLedgerId: "token-valid", price: "2.0" },
        ]),
      );

      // Act
      const result = await icpswapTokenPriceService.getTokenPrices();
      const map = result.unwrap();

      // Assert
      expect("token-neg" in map).toBe(false);
      expect(map["token-valid"]).toBeCloseTo(2.0);
    });
  });
});
