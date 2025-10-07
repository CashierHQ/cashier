import { describe, expect, it } from "vitest";
import { LinkStore } from "../linkStore.svelte";
import { LinkType } from "../../types/linkType";
import { LinkStep } from "../../types/linkStep";

describe("ChooseLinkTypeState", () => {
  it("advances to ADD_ASSET when title and TIP type provided", async () => {
    // Arrange
    const store = new LinkStore();

    // Assert initial step
    expect(store.state.step).toEqual(LinkStep.CHOOSE_TYPE);

    // Act: provide required inputs
    store.title = "My tip";
    store.linkType = LinkType.TIP;
    await store.goNext();

    // Assert: transitioned to ADD_ASSET
    expect(store.state.step).toEqual(LinkStep.ADD_ASSET);
  });

  it("throws when title is empty", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "";
    store.linkType = LinkType.TIP;

    // Act + Assert: goNext should reject due to empty title
    await expect(store.goNext()).rejects.toThrow(
      "Title is required to proceed",
    );
  });

  it("throws when link type is not TIP", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "My tip";
    // Act: set an unsupported link type
    store.linkType = LinkType.AIRDROP;

    // Assert: goNext rejects with unsupported type message
    await expect(store.goNext()).rejects.toThrow(
      "Only Tip link type is supported currently",
    );
  });
});
