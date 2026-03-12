import { LinkCreatedStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/created";
import { LinkStep } from "$modules/links/types/linkStep";
import { describe, expect, it } from "vitest";

describe("LinkCreatedStateV3", () => {
  describe("step", () => {
    it("it_should_succeed_have_created_step", () => {
      const state = new LinkCreatedStateV3();
      expect(state.step).toBe(LinkStep.CREATED);
    });
  });

  describe("goNext", () => {
    it("it_should_fail_go_next_always", async () => {
      const state = new LinkCreatedStateV3();
      await expect(state.goNext()).rejects.toThrow(
        "No next state from Created",
      );
    });
  });

  describe("goBack", () => {
    it("it_should_fail_go_back_always", async () => {
      const state = new LinkCreatedStateV3();
      await expect(state.goBack()).rejects.toThrow(
        "No previous state from Created",
      );
    });
  });
});
