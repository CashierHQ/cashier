import { LinkType } from "$modules/links/types/link/linkType";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { describe, expect, it, vi } from "vitest";
import { LinkCreationStore } from "../linkCreationStore.svelte";
import { AddAssetTipLinkState } from "./tiplink/addAsset";
import { CreateLinkData } from "../../types/createLinkData";
import { TempLink } from "$modules/links/types/tempLink";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkStep } from "$modules/links/types/linkStep";

// mock wallet store
vi.mock("$modules/token/state/walletStore.svelte", () => {
  const mockQuery = {
    data: undefined as TokenWithPriceAndBalance[] | undefined,
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

describe("ChooseLinkTypeState", () => {
  it("should transition to ADD_ASSET sucessfully", async () => {
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
    store.createLinkData.linkType = LinkType.TIP;

    // Act
    await store.goNext();

    // Assert
    expect(store.state.step).toEqual(LinkStep.ADD_ASSET);
  });

  it("should throws when title is empty", async () => {
    // Arrange
    const tempLink = new TempLink(
      "test-id",
      BigInt(Date.now()),
      LinkState.CHOOSING_TYPE,
      new CreateLinkData({
        title: "",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );
    const store = new LinkCreationStore(tempLink);
    store.createLinkData.title = "";
    store.createLinkData.linkType = LinkType.TIP;

    // Act
    const res = store.goNext();

    // Assert
    await expect(res).rejects.toThrow("Title is required to proceed");
  });

  it("should throws when link type is not TIP", async () => {
    // Arrange
    const tempLink = new TempLink(
      "test-id",
      BigInt(Date.now()),
      LinkState.CHOOSING_TYPE,
      new CreateLinkData({
        title: "My tip",
        linkType: LinkType.AIRDROP,
        assets: [],
        maxUse: 1,
      }),
    );
    const store = new LinkCreationStore(tempLink);
    store.createLinkData.title = "My tip";
    store.createLinkData.linkType = LinkType.AIRDROP;

    // Act
    const res = store.goNext();

    // Assert
    await expect(res).rejects.toThrow(
      "Only Tip link type is supported currently",
    );
  });

  it("should transiton to ADD_ASSET_TIP_LINK for tip link types", async () => {
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
    store.createLinkData.linkType = LinkType.TIP;

    // Act
    await store.goNext();

    // Assert
    expect(store.state).toBeInstanceOf(AddAssetTipLinkState);
  });
});
