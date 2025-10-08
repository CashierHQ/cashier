import { describe, expect, it } from "vitest";
import { ICP_LEDGER_CANISTER_ID } from "../constants";
import type { TokenWithPriceAndBalance } from "../types";
import { sortWalletTokens } from "./sorter";

describe("sortWalletTokens", () => {
  it("should sort tokens correctly", () => {
    const tokens: TokenWithPriceAndBalance[] = [
      {
        address: "oj6if-riaaa-aaaaq-aaeha-cai",
        name: "Alice coin",
        symbol: "ALICE",
        priceUSD: 0.00001,
        balance: 0n,
        decimals: 18,
        enabled: true,
        fee: 10000n,
        is_default: false,
      },
      {
        address: "mxzaz-hqaaa-aaaar-qaada-cai",
        name: "Chainkey Bitcoin",
        symbol: "ckBTC",
        priceUSD: 100000.01,
        balance: 0n,
        decimals: 8,
        enabled: true,
        fee: 10n,
        is_default: true,
      },
      {
        address: ICP_LEDGER_CANISTER_ID,
        name: "Internet Computer",
        symbol: "ICP",
        priceUSD: 5.01,
        balance: 0n,
        decimals: 8,
        enabled: true,
        fee: 10000n,
        is_default: true,
      },
      {
        address: "xevnm-gaaaa-aaaar-qafnq-cai",
        name: "Chainkey USDC",
        symbol: "ckUSDC",
        priceUSD: 1.0,
        balance: 0n,
        decimals: 8,
        enabled: true,
        fee: 10000n,
        is_default: true,
      },
      {
        address: "ss2fx-dyaaa-aaaar-qacoq-cai",
        name: "Chainkey Ethereum",
        symbol: "ckETH",
        priceUSD: 4500.0,
        balance: 0n,
        decimals: 18,
        enabled: true,
        fee: 2_000_000_000n,
        is_default: false,
      },
    ];

    const sortedTokens = sortWalletTokens(tokens);
    const sortedAddresses = sortedTokens.map((t) => t.address);

    expect(sortedAddresses).toEqual([
      ICP_LEDGER_CANISTER_ID, // ICP first
      "mxzaz-hqaaa-aaaar-qaada-cai", // then default tokens sorted by address
      "xevnm-gaaaa-aaaar-qafnq-cai",
      "oj6if-riaaa-aaaaq-aaeha-cai", // then non-default tokens sorted by address
      "ss2fx-dyaaa-aaaar-qacoq-cai",
    ]);
  });
});
