import { LinkStep } from "$modules/links/types/linkStep";
import { ActionType as SharedActionType } from "$shared";
import { describe, expect, it } from "vitest";
import { LinkEndedStateV3 } from "./ended";

describe("LinkEndedStateV3", () => {
  describe("step", () => {
    it("it_should_succeed_do_have_inactive_step", () => {
      const state = new LinkEndedStateV3();
      expect(state.step).toBe(LinkStep.INACTIVE);
    });
  });

  describe("createAction", () => {
    it("it_should_fail_do_create_action_due_to_not_supported_in_ended_state", async () => {
      const state = new LinkEndedStateV3();
      await expect(
        state.createAction(SharedActionType.Withdraw),
      ).rejects.toThrow(
        "Creating Withdraw action is not supported in Ended state",
      );
    });
  });

  describe("processAction", () => {
    it("it_should_fail_do_process_action_due_to_ended_state", async () => {
      const state = new LinkEndedStateV3();
      await expect(state.processAction()).rejects.toThrow(
        "Link has ended; no further actions can be processed.",
      );
    });
  });
});
