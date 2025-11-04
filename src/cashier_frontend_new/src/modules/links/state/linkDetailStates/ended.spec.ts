import { describe, it, expect } from "vitest";
import { LinkEndedState } from "./ended";
import type { LinkDetailStore } from "../linkDetailStore.svelte";

describe("LinkEndedState", () => {
  it("createAction should throw that link has ended", async () => {
    // Arrange
    const store = { query: { data: undefined } } as unknown as LinkDetailStore;
    const state = new LinkEndedState(store);

    // Act
    const res = state.createAction();

    // Assert
    await expect(res).rejects.toThrow(
      "Link has ended; no further actions can be created.",
    );
  });

  it("processAction should throw that link has ended", async () => {
    // Arrange
    const store = { query: { data: undefined } } as unknown as LinkDetailStore;
    const state = new LinkEndedState(store);

    // Act
    const res = state.processAction();

    // Assert
    await expect(res).rejects.toThrow(
      "Link has ended; no further actions can be processed.",
    );
  });
});
