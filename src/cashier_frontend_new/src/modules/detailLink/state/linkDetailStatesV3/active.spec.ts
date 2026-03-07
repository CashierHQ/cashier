import { LinkStep } from "$modules/links/types/linkStep";
import { ActionType as SharedActionType } from "$shared";
import { describe, expect, it } from "vitest";
import { LinkActiveStateV3 } from "./active";

describe("LinkActiveStateV3", () => {
  describe("step", () => {
    it("it_should_succeed_have_active_step", () => {
      const state = new LinkActiveStateV3();
      expect(state.step).toBe(LinkStep.ACTIVE);
    });
  });

  describe("createAction", () => {
    it("it_should_fail_do_create_action_due_to_not_supported_in_active_state", async () => {
      const state = new LinkActiveStateV3();
      await expect(
        state.createAction(SharedActionType.CreateLink),
      ).rejects.toThrow("Create action is not supported in Active state");
    });
  });

  describe("processAction", () => {
    it("it_should_fail_do_process_action_due_to_not_supported_in_active_state", async () => {
      const state = new LinkActiveStateV3();
      await expect(state.processAction()).rejects.toThrow(
        "Process action is not supported in Active state",
      );
    });
  });
});
