import { describe, expect, it } from "vitest";
import type { TokenWithPriceAndBalance } from "../types";
import { findTokenByAddress } from "./tokenStore.svelte";

describe("findTokenByAddress", () => {
  it("should return the correct token when it exists", () => {
    // Mock walletTokensQuery data
    const mockData: TokenWithPriceAndBalance[] = [
      {
        address: "token1",
        name: "Token One",
        decimals: 8,
        balance: BigInt(100),
        priceUSD: 1.0,
        symbol: "T1",
        enabled: true,
        fee: BigInt(10),
      },
      {
        address: "token2",
        name: "Token Two",
        decimals: 6,
        balance: BigInt(200),
        priceUSD: 2.0,
        symbol: "T2",
        enabled: true,
        fee: BigInt(20),
      },
    ];
    // @ts-ignore
    walletTokensQuery.data = mockData;

    const result = findTokenByAddress("token1");
    expect(result).toEqual({
      address: "token1",
      name: "Token One",
      decimals: 8,
    });
  });

  it("should throw an error when wallet tokens data is not loaded", () => {
    // @ts-ignore
    walletTokensQuery.data = null;

    expect(() => findTokenByAddress("token1")).toThrow(
      "Wallet tokens data is not loaded",
    );
  });

  it("should throw an error when the token is not found", () => {
    // Mock walletTokensQuery data
    const mockData: TokenWithPriceAndBalance[] = [
      {
        address: "token1",
        name: "Token One",
        decimals: 8,
        balance: BigInt(100),
        priceUSD: 1.0,
        symbol: "T1",
        enabled: true,
        fee: BigInt(10),
      },
      {
        address: "token2",
        name: "Token Two",
        decimals: 6,
        balance: BigInt(200),
        priceUSD: 2.0,
        symbol: "T2",
        enabled: true,
        fee: BigInt(20),
      },
    ];
    // @ts-ignore
    walletTokensQuery.data = mockData;

    expect(() => findTokenByAddress("token3")).toThrow(
      "Token not found in wallet",
    );
  });
});
