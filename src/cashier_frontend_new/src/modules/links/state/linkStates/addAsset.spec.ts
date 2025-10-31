import {
  CreateLinkAsset,
  CreateLinkData,
} from "$modules/links/types/createLinkData";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { describe, expect, it, vi } from "vitest";
import { LinkStep } from "../../types/linkStep";
import { LinkStore } from "../linkStore.svelte";

vi.mock("$modules/token/state/walletStore.svelte", () => {
  const mockWalletTokens: TokenWithPriceAndBalance[] = [
    {
      name: "token1",
      symbol: "TKN1",
      address: "aaaaa-aa",
      decimals: 8,
      enabled: true,
      fee: 10_000n,
      is_default: false,
      balance: 1_000_000n,
      priceUSD: 1.0,
    },
  ];
  const mockQuery = {
    data: mockWalletTokens,
  };

  return {
    walletStore: {
      get query() {
        return mockQuery;
      },
      findTokenByAddress: vi.fn(),
      toggleToken: vi.fn(),
      addToken: vi.fn(),
      transferTokenToPrincipal: vi.fn(),
      transferICPToAccount: vi.fn(),
      icpAccountID: vi.fn(),
    },
    __mockQuery: mockQuery,
  };
});

describe("AddAssetState", () => {
  it("should transition to PREVIEW successfully", async () => {
    // Arrange
    const store = new LinkStore();
    store.createLinkData.title = "My tip";

    // Act: move to ADD_ASSET
    await store.goNext();

    // Assert precondition
    expect(store.state.step).toEqual(LinkStep.ADD_ASSET);

    // Arrange: provide tip link details
    store.createLinkData = new CreateLinkData({
      title: "Test",
      linkType: store.createLinkData.linkType,
      maxUse: 1,
      assets: [new CreateLinkAsset("aaaaa-aa", 100n)],
    });

    // Act: attempt to go next
    await store.goNext();

    // Assert: moved to PREVIEW
    expect(store.state.step).toEqual(LinkStep.PREVIEW);
  });

  it("should throws when asset is empty", async () => {
    // Arrange
    const store = new LinkStore();
    store.createLinkData.title = "My tip";
    await store.goNext(); // to ADD_ASSET

    // Act: set empty asset
    store.createLinkData = new CreateLinkData({
      title: "Test",
      linkType: store.createLinkData.linkType,
      maxUse: 1,
      assets: [new CreateLinkAsset("", 100n)],
    });

    // Assert
    await expect(store.goNext()).rejects.toThrow(
      "Address is required to proceed",
    );
  });

  it("should throws when amount is zero or negative", async () => {
    // Arrange
    const store = new LinkStore();
    store.createLinkData.title = "My tip";
    await store.goNext(); // to ADD_ASSET

    // Act: set invalid amount
    store.createLinkData = new CreateLinkData({
      title: "Test",
      linkType: store.createLinkData.linkType,
      maxUse: 1,
      assets: [new CreateLinkAsset("aaaaa-aa", 0n)],
    });

    // Assert
    await expect(store.goNext()).rejects.toThrow(
      "Amount must be greater than zero to proceed",
    );
  });
});
