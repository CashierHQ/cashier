import { describe, expect, it } from "vitest";
import { LinkStore } from "../linkStore.svelte";
import { LinkType } from "../../types/linkType";
import { LinkStep } from "../../types/linkStep";

describe("ChooseLinkTypeState", () => {
  it("should transition to ADD_ASSET sucessfully", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "My tip";
    store.linkType = LinkType.TIP;

    // Act

    await store.goNext();

    // Assert
    expect(store.state.step).toEqual(LinkStep.ADD_ASSET);
  });

  it("should throws when title is empty", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "";
    store.linkType = LinkType.TIP;

    // Act
    const res = store.goNext();

    // Assert
    await expect(res).rejects.toThrow("Title is required to proceed");
  });

  it("should throws when link type is not TIP", async () => {
    // Arrange
    const store = new LinkStore();
    store.title = "My tip";
    store.linkType = LinkType.AIRDROP;

    // Act
    const res = store.goNext();

    // Assert
    await expect(res).rejects.toThrow(
      "Only Tip link type is supported currently",
    );
  });
});
