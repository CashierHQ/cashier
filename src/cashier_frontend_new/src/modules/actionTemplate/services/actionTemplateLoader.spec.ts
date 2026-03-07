import { ActionTemplateLoader } from "$modules/actionTemplate/services/actionTemplateLoader";
import { ActionState, ActionType, IntentState, LinkType } from "$shared";
import { Principal } from "@dfinity/principal";
import { describe, expect, it } from "vitest";

const loader = new ActionTemplateLoader();
const CREATOR = Principal.fromText("aaaaa-aa");

describe("getTemplateForActionType", () => {
  it("it_should_fail_get_template_due_to_no_matching_action_type_for_receive_payment", () => {
    // ReceivePayment has an empty templates array — no action type will match
    const result = loader.getTemplateForActionType(
      LinkType.ReceivePayment,
      ActionType.Send,
    );
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toContain(
      "No template found for action type",
    );
  });

  it("it_should_fail_get_template_due_to_action_type_absent_from_link_templates", () => {
    // SendTip templates contain CreateLink / Receive / Withdraw — not Send
    const result = loader.getTemplateForActionType(
      LinkType.SendTip,
      ActionType.Send,
    );
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toContain(
      "No template found for action type",
    );
  });

  it("it_should_succeed_get_template_for_send_tip_create_link", () => {
    const result = loader.getTemplateForActionType(
      LinkType.SendTip,
      ActionType.CreateLink,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.CreateLink);
  });

  it("it_should_succeed_get_template_for_send_tip_receive", () => {
    const result = loader.getTemplateForActionType(
      LinkType.SendTip,
      ActionType.Receive,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Receive);
  });

  it("it_should_succeed_get_template_for_send_tip_withdraw", () => {
    const result = loader.getTemplateForActionType(
      LinkType.SendTip,
      ActionType.Withdraw,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Withdraw);
  });

  it("it_should_succeed_get_template_for_send_airdrop_create_link", () => {
    const result = loader.getTemplateForActionType(
      LinkType.SendAirdrop,
      ActionType.CreateLink,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.CreateLink);
  });

  it("it_should_succeed_get_template_for_send_airdrop_receive", () => {
    const result = loader.getTemplateForActionType(
      LinkType.SendAirdrop,
      ActionType.Receive,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Receive);
  });

  it("it_should_succeed_get_template_for_send_airdrop_withdraw", () => {
    const result = loader.getTemplateForActionType(
      LinkType.SendAirdrop,
      ActionType.Withdraw,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Withdraw);
  });

  it("it_should_succeed_get_template_for_send_token_basket_create_link", () => {
    const result = loader.getTemplateForActionType(
      LinkType.SendTokenBasket,
      ActionType.CreateLink,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.CreateLink);
  });

  it("it_should_succeed_get_template_for_send_token_basket_receive", () => {
    const result = loader.getTemplateForActionType(
      LinkType.SendTokenBasket,
      ActionType.Receive,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Receive);
  });

  it("it_should_succeed_get_template_for_send_token_basket_withdraw", () => {
    const result = loader.getTemplateForActionType(
      LinkType.SendTokenBasket,
      ActionType.Withdraw,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Withdraw);
  });
});

describe("createActionFromTemplate", () => {
  it("it_should_fail_create_action_due_to_no_templates_for_receive_payment", () => {
    const result = loader.createActionFromTemplate(
      LinkType.ReceivePayment,
      ActionType.CreateLink,
      CREATOR,
    );
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toContain(
      "Invalid template or intents",
    );
  });

  it("it_should_fail_create_action_due_to_action_type_absent_from_link_templates", () => {
    // SendTip has no Send template
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.Send,
      CREATOR,
    );
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toContain(
      "Invalid template or intents",
    );
  });

  it("it_should_succeed_create_action_with_fresh_ids", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);
    const action = result.unwrap();
    // IDs must be new UUIDs, not the placeholder values from the template
    expect(action.id).not.toBe("create_action_id");
    action.intents.forEach((intent) => {
      expect(intent.id).not.toBe("asset_intent_id");
      expect(intent.id).not.toBe("fee_intent_id");
    });
  });

  it("it_should_succeed_create_action_with_given_creator", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().creator.toText()).toBe(CREATOR.toText());
  });

  it("it_should_succeed_create_action_with_created_state_for_action_and_intents", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);
    const action = result.unwrap();
    expect(action.action_state).toBe(ActionState.Created);
    action.intents.forEach((intent) => {
      expect(intent.intent_state).toBe(IntentState.Created);
    });
  });

  it("it_should_succeed_create_action_with_correct_action_type", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.Receive,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Receive);
  });

  it("it_should_succeed_create_action_with_non_empty_intents", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().intents.length).toBeGreaterThan(0);
  });

  it("it_should_succeed_create_action_for_send_airdrop_receive", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendAirdrop,
      ActionType.Receive,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Receive);
  });

  it("it_should_succeed_create_action_for_send_airdrop_withdraw", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendAirdrop,
      ActionType.Withdraw,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Withdraw);
  });

  it("it_should_succeed_create_action_for_send_token_basket_receive", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTokenBasket,
      ActionType.Receive,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Receive);
  });

  it("it_should_succeed_create_action_for_send_token_basket_withdraw", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTokenBasket,
      ActionType.Withdraw,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_type).toBe(ActionType.Withdraw);
  });
});
