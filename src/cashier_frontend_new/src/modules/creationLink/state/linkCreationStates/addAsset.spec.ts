import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { describe, expect, it, vi } from "vitest";
import { LinkCreationStore } from "../linkCreationStore.svelte";
import TempLink from "$modules/links/types/tempLink";
import { LinkState } from "$modules/links/types/link/linkState";
import {
  CreateLinkAsset,
  CreateLinkData,
} from "$modules/creationLink/types/createLinkData";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";

// mock wallet store
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
    const tempLink = new TempLink(
      "test-id",
      BigInt(Date.now()),
      LinkState.CHOOSING_TYPE,
      new CreateLinkData({
        title: "My tip",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );
    const store = new LinkCreationStore(tempLink);
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
    const tempLink = new TempLink(
      "test-id",
      BigInt(Date.now()),
      LinkState.CHOOSING_TYPE,
      new CreateLinkData({
        title: "My tip",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );
    const store = new LinkCreationStore(tempLink);
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
    await expect(store.goNext()).rejects.toThrow();
  });

  it("should throws when amount is zero or negative", async () => {
    // Arrange
    const tempLink = new TempLink(
      "test-id",
      BigInt(Date.now()),
      LinkState.CHOOSING_TYPE,
      new CreateLinkData({
        title: "My tip",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );
    const store = new LinkCreationStore(tempLink);
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
    await expect(store.goNext()).rejects.toThrow();
  });
});
