import { describe, expect, it } from "vitest";
import { LinkStore } from "../linkStore.svelte";
import { LinkStep } from "../../types/linkStep";
import {
  CreateLinkAsset,
  CreateLinkData,
} from "$modules/links/types/createLinkData";

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
