import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { beforeEach, describe, expect, it } from "vitest";
import { CompletedState } from "./completed";

describe("CompletedState", () => {
  let state: CompletedState;

  beforeEach(() => {
    // Create a mock store with minimal required properties
    state = new CompletedState();
  });

  describe("initialization", () => {
    it("should have correct step", () => {
      expect(state.step).toBe(UserLinkStep.COMPLETED);
    });
  });

  describe("goNext", () => {
    it("should throws error", async () => {
      await expect(state.goNext()).rejects.toThrow(
        "Completed is final state, cannot go next",
      );
    });
  });

  describe("goBack", () => {
    it("should throws error", async () => {
      await expect(state.goBack()).rejects.toThrow(
        "Completed is final state, cannot go back",
      );
    });
  });

  describe("action capabilities", () => {
    it("should not have createAction method", () => {
      expect("createAction" in state).toBe(false);
    });

    it("should not have processAction method", () => {
      expect("processAction" in state).toBe(false);
    });
  });
});
