import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { beforeEach, describe, expect, it } from "vitest";
import { CompletedStateV3 } from "$modules/useLink/state/useLinkStatesV3/completed";

describe("CompletedStateV3", () => {
  let state: CompletedStateV3;

  beforeEach(() => {
    state = new CompletedStateV3();
  });

  describe("step", () => {
    it("it_should_succeed_do_have_completed_step", () => {
      expect(state.step).toBe(UserLinkStep.COMPLETED);
    });
  });

  describe("goNext", () => {
    it("it_should_fail_do_go_next_due_to_completed_final_state", async () => {
      await expect(state.goNext()).rejects.toThrow(
        "Completed is final state, cannot go next",
      );
    });
  });

  describe("goBack", () => {
    it("it_should_fail_do_go_back_due_to_completed_final_state", async () => {
      await expect(state.goBack()).rejects.toThrow(
        "Completed is final state, cannot go back",
      );
    });
  });

  describe("goToLanding", () => {
    it("it_should_fail_do_go_to_landing_due_to_completed_final_state", async () => {
      await expect(state.goToLanding()).rejects.toThrow(
        "Completed is final state, cannot go to Landing",
      );
    });
  });
});
