import { describe, expect, it } from "vitest";
import { ICP_LEDGER_CANISTER_ID } from "../constants";
import type { TokenWithPriceAndBalance } from "../types";
import { sortWalletTokens } from "./sorter";

function makeToken(
  overrides: Partial<TokenWithPriceAndBalance> & { address: string },
): TokenWithPriceAndBalance {
  return {
    name: overrides.address,
    symbol: overrides.address,
    priceUSD: 0,
    balance: 0n,
    decimals: 8,
    enabled: true,
    fee: 10000n,
    is_default: false,
    ...overrides,
  };
}

describe("sortWalletTokens", () => {
  it("orders tier 1 (enabled + USD > 0) by USD desc", () => {
    const tokens = [
      makeToken({
        address: "default-poor",
        priceUSD: 0.01,
        balance: 1n,
        decimals: 0,
        is_default: true,
      }),
      makeToken({
        address: "non-default-rich",
        priceUSD: 1_000_000,
        balance: 1000n,
        decimals: 0,
        is_default: false,
      }),
    ];

    expect(sortWalletTokens(tokens).map((t) => t.address)).toEqual([
      "non-default-rich",
      "default-poor",
    ]);
  });

  it("places tier 2 (enabled + USD = 0) below tier 1 with ICP first then defaults", () => {
    const tokens = [
      makeToken({
        address: "zzz-non-default",
        is_default: false,
      }),
      makeToken({
        address: ICP_LEDGER_CANISTER_ID,
        is_default: true,
      }),
      makeToken({
        address: "aaa-default-zero",
        is_default: true,
      }),
      makeToken({
        address: "tier1-token",
        priceUSD: 1,
        balance: 1n,
        decimals: 0,
        is_default: false,
      }),
    ];

    expect(sortWalletTokens(tokens).map((t) => t.address)).toEqual([
      "tier1-token",
      ICP_LEDGER_CANISTER_ID,
      "aaa-default-zero",
      "zzz-non-default",
    ]);
  });

  it("sinks disabled tokens to the bottom regardless of USD value", () => {
    const tokens = [
      makeToken({
        address: "disabled-rich",
        priceUSD: 1_000_000,
        balance: 1000n,
        decimals: 0,
        is_default: true,
        enabled: false,
      }),
      makeToken({
        address: "enabled-poor-zero",
        is_default: false,
        enabled: true,
      }),
    ];

    expect(sortWalletTokens(tokens).map((t) => t.address)).toEqual([
      "enabled-poor-zero",
      "disabled-rich",
    ]);
  });

  it("orders disabled tokens by USD desc then address", () => {
    const tokens = [
      makeToken({
        address: "bbb-disabled-zero",
        enabled: false,
      }),
      makeToken({
        address: "aaa-disabled-zero",
        enabled: false,
      }),
      makeToken({
        address: "disabled-with-value",
        priceUSD: 100,
        balance: 1n,
        decimals: 0,
        enabled: false,
      }),
    ];

    expect(sortWalletTokens(tokens).map((t) => t.address)).toEqual([
      "disabled-with-value",
      "aaa-disabled-zero",
      "bbb-disabled-zero",
    ]);
  });

  it("integrates all tiers in expected order", () => {
    const tokens: TokenWithPriceAndBalance[] = [
      makeToken({
        address: "oj6if-riaaa-aaaaq-aaeha-cai",
        symbol: "ALICE",
        priceUSD: 0.00001,
        balance: 1000n,
        decimals: 18,
        is_default: false,
      }),
      makeToken({
        address: "mxzaz-hqaaa-aaaar-qaada-cai",
        symbol: "ckBTC",
        priceUSD: 100000.01,
        balance: 1000n,
        is_default: true,
      }),
      makeToken({
        address: ICP_LEDGER_CANISTER_ID,
        symbol: "ICP",
        priceUSD: 5.01,
        balance: 1000n,
        is_default: true,
      }),
      makeToken({
        address: "xevnm-gaaaa-aaaar-qafnq-cai",
        symbol: "ckUSDC",
        priceUSD: 1.0,
        balance: 0n,
        is_default: true,
      }),
      makeToken({
        address: "ss2fx-dyaaa-aaaar-qacoq-cai",
        symbol: "ckETH",
        priceUSD: 4500.0,
        balance: 0n,
        decimals: 18,
        is_default: false,
      }),
      makeToken({
        address: "disabled-token",
        symbol: "DIS",
        priceUSD: 9999,
        balance: 1000n,
        is_default: false,
        enabled: false,
      }),
    ];

    expect(sortWalletTokens(tokens).map((t) => t.address)).toEqual([
      "mxzaz-hqaaa-aaaar-qaada-cai", // tier 1: ckBTC ($10M)
      ICP_LEDGER_CANISTER_ID, // tier 1: ICP ($5K)
      "oj6if-riaaa-aaaaq-aaeha-cai", // tier 1: ALICE ($0.01)
      "xevnm-gaaaa-aaaar-qafnq-cai", // tier 2: ckUSDC (default)
      "ss2fx-dyaaa-aaaar-qacoq-cai", // tier 2: ckETH (non-default)
      "disabled-token", // tier 3
    ]);
  });
});
