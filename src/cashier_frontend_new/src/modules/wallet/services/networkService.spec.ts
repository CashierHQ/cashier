import { describe, it, expect } from "vitest";
import {
  getNetworkForToken,
  getNetworkName,
  getNetworkLogo,
} from "./networkService";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

describe("networkService", () => {
  const mockIcpToken: TokenWithPriceAndBalance = {
    name: "Internet Computer",
    symbol: "ICP",
    address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    decimals: 8,
    enabled: true,
    fee: 10_000n,
    is_default: true,
    balance: 100_000_000n,
    priceUSD: 10.5,
  };

  const mockCkEthToken: TokenWithPriceAndBalance = {
    name: "ckETH",
    symbol: "ckETH",
    address: "mxzaz-hqaaa-aaaar-qaada-cai",
    decimals: 18,
    enabled: true,
    fee: 60n,
    is_default: false,
    balance: 1_000_000_000n,
    priceUSD: 3000,
  };

  describe("getNetworkForToken", () => {
    it("should return ICP network for ICP token", () => {
      const network = getNetworkForToken(mockIcpToken);
      expect(network).toEqual({
        id: "icp",
        name: "Internet Computer",
        logoUrl: "/icpLogo.png",
      });
    });

    it("should return ICP network for any token (all tokens are on ICP)", () => {
      const network = getNetworkForToken(mockCkEthToken);
      expect(network).toEqual({
        id: "icp",
        name: "Internet Computer",
        logoUrl: "/icpLogo.png",
      });
    });

    it("should return ICP network for null token", () => {
      const network = getNetworkForToken(null);
      expect(network).toEqual({
        id: "icp",
        name: "Internet Computer",
        logoUrl: "/icpLogo.png",
      });
    });
  });

  describe("getNetworkName", () => {
    it("should return Internet Computer for any token", () => {
      expect(getNetworkName(mockIcpToken)).toBe("Internet Computer");
      expect(getNetworkName(mockCkEthToken)).toBe("Internet Computer");
      expect(getNetworkName(null)).toBe("Internet Computer");
    });
  });

  describe("getNetworkLogo", () => {
    it("should return ICP logo URL for any token", () => {
      expect(getNetworkLogo(mockIcpToken)).toBe("/icpLogo.png");
      expect(getNetworkLogo(mockCkEthToken)).toBe("/icpLogo.png");
      expect(getNetworkLogo(null)).toBe("/icpLogo.png");
    });
  });
});
