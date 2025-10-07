import { describe, expect, it } from "vitest";
import { LinkStore } from "../linkStore.svelte";
import { LinkStep } from "../../types/linkStep";

describe("AddAssetState", () => {
  it("advances to PREVIEW when tipLink has asset and positive amount", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "My tip";

    // Act: move to ADD_ASSET
    await store.goNext();

    // Assert precondition
    expect(store.state.step).toEqual(LinkStep.ADD_ASSET);

    // Arrange: provide tip link details
    store.tipLink = { asset: "aaaaa-aa", amount: 10 };

    // Act: attempt to go next
    await store.goNext();

    // Assert: moved to PREVIEW
    expect(store.state.step).toEqual(LinkStep.PREVIEW);
  });

  it("throws when tipLink is missing", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "My tip";
    await store.goNext(); // to ADD_ASSET

    // Act: clear tipLink
    store.tipLink = undefined;

    // Assert: goNext rejects with informative message
    await expect(store.goNext()).rejects.toThrow(
      "Tip link details are required to proceed",
    );
  });

  it("throws when asset is empty", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "My tip";
    await store.goNext(); // to ADD_ASSET

    // Act: set empty asset
    store.tipLink = { asset: "", amount: 10 };

    // Assert
    await expect(store.goNext()).rejects.toThrow(
      "Asset is required to proceed",
    );
  });

  it("throws when amount is zero or negative", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "My tip";
    await store.goNext(); // to ADD_ASSET

    // Act: set invalid amount
    store.tipLink = { asset: "aaaaa-aa", amount: 0 };

    // Assert
    await expect(store.goNext()).rejects.toThrow(
      "Amount must be greater than zero to proceed",
    );
  });
});
