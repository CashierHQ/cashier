import { ActionType } from "$modules/links/types/action/actionType";
import { describe, expect, it } from "vitest";
import { LinkEndedState } from "./ended";

describe("LinkEndedState", () => {
  it("createAction should throw that link has ended", async () => {
    // Arrange
    const state = new LinkEndedState();

    // Act
    const res = state.createAction(ActionType.RECEIVE);

    // Assert
    await expect(res).rejects.toThrow(
      "Creating RECEIVE action is not supported in Ended state",
    );
  });

  it("processAction should throw that link has ended", async () => {
    // Arrange
    const state = new LinkEndedState();

    // Act
    const res = state.processAction();

    // Assert
    await expect(res).rejects.toThrow(
      "Link has ended; no further actions can be processed.",
    );
  });
});
