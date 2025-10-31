import { walletStore } from "$modules/token/state/walletStore.svelte";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Err, Ok } from "ts-results-es";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateLinkAsset } from "../types/createLinkData";
import { calculateRequiredAssetAmount } from "./amountCalculator";

// mock walletStore
vi.mock("$modules/token/state/walletStore.svelte", () => ({
  walletStore: {
    findTokenByAddress: vi.fn(),
  },
}));

describe("calculateRequiredAssetAmount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return an error if token is not found", () => {
    vi.mocked(walletStore.findTokenByAddress).mockReturnValueOnce(
      Err(new Error("Token not found")),
    );

    const assets: CreateLinkAsset[] = [
      new CreateLinkAsset("nonexistentToken", 1000n),
    ];
    const maxUse = 2;

    const result = calculateRequiredAssetAmount(assets, maxUse);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        "Token with address nonexistentToken not found in wallet",
      );
    }
  });

  it("should calculate required amounts correctly", () => {
    const fee = 10_000n;
    const mockToken: TokenWithPriceAndBalance = {
      name: "token1",
      symbol: "TKN1",
      address: "0xToken1Address",
      decimals: 8,
      enabled: true,
      fee,
      is_default: false,
      balance: 1_000_000_000n,
      priceUSD: 1.0,
    };

    // mock findTokenByAddress to return a token with a fee
    vi.mocked(walletStore.findTokenByAddress).mockReturnValue(Ok(mockToken));

    const amount1 = 1000_000n;
    const amount2 = 2000_000n;
    const assets: CreateLinkAsset[] = [
      new CreateLinkAsset("token1", amount1),
      new CreateLinkAsset("token2", amount2),
    ];
    const maxUse = 3;

    const result = calculateRequiredAssetAmount(assets, maxUse);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const requiredAmounts = result.unwrap();
      expect(requiredAmounts["token1"]).toBe(amount1 * 3n + fee * (1n + 3n));
      expect(requiredAmounts["token2"]).toBe(amount2 * 3n + fee * (1n + 3n));
    }
  });
});
