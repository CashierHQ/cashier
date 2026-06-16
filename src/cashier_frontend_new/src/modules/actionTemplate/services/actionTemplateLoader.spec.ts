import { ActionTemplateLoader } from "$modules/actionTemplate/services/actionTemplateLoader";
import {
  ActionState,
  ActionType,
  AddressType,
  calculateIntentFees,
  getLinkCreationFeeAmount,
  IntentParticipants,
  IntentState,
  LinkType,
  TokenStandard,
} from "$shared";
import {
  CASHIER_BACKEND_CANISTER_ID,
  FEE_TREASURY_PRINCIPAL,
} from "$modules/shared/constants";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import { Principal } from "@icp-sdk/core/principal";
import { describe, expect, it } from "vitest";

const loader = new ActionTemplateLoader();
const CREATOR = Principal.fromText("aaaaa-aa");
const ICP_LEDGER_CANISTER_ID_FALLBACK = "ryjl3-tyaaa-aaaaa-aaaba-cai";

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
      expect(intent.id).not.toBe("link_creation_fee_intent_id");
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

  it("it_should_append_populated_link_creation_fee_intent_for_create_link", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);

    const action = result.unwrap();
    const linkCreationFeeIntent = action.intents.find(
      (intent) => intent.dest_address_type === AddressType.Treasury,
    );
    expect(linkCreationFeeIntent).toBeDefined();

    const expectedFees = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToTreasury,
      token_standard: TokenStandard.ICRC2,
      asset_network_fee: ICP_LEDGER_FEE,
      link_creation_fee: getLinkCreationFeeAmount(),
    });

    expect(linkCreationFeeIntent?.source_address.toText()).toBe(
      CREATOR.toText(),
    );
    expect(linkCreationFeeIntent?.source_address_type).toBe(
      AddressType.Creator,
    );
    expect(linkCreationFeeIntent?.dest_address.toText()).toBe(
      FEE_TREASURY_PRINCIPAL,
    );
    expect(linkCreationFeeIntent?.asset.address.toText()).toBe(
      ICP_LEDGER_CANISTER_ID || ICP_LEDGER_CANISTER_ID_FALLBACK,
    );
    expect(linkCreationFeeIntent?.asset.network_fee).toBe(ICP_LEDGER_FEE);
    expect(linkCreationFeeIntent?.asset.token_standard).toBe(
      TokenStandard.ICRC2,
    );
    expect(linkCreationFeeIntent?.amount).toBe(
      BigInt(expectedFees.intent_total_amount),
    );
    expect(linkCreationFeeIntent?.total_amount).toBe(
      BigInt(expectedFees.intent_total_amount),
    );
    expect(linkCreationFeeIntent?.network_fee).toBe(
      BigInt(expectedFees.intent_total_network_fee),
    );
    expect(linkCreationFeeIntent?.user_fee).toBe(
      BigInt(expectedFees.intent_user_fee),
    );
  });

  it("it_should_populate_asset_intent_from_selected_asset_info", () => {
    const assetPrincipal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
      {
        assetInfo: [
          {
            asset: {
              address: assetPrincipal,
              network_fee: 500n,
              token_standard: TokenStandard.ICRC1,
            },
            amount: 999n,
            label: "ICP",
          },
        ],
      },
    );
    expect(result.isOk()).toBe(true);

    const action = result.unwrap();
    const assetIntent = action.intents.find(
      (intent) => intent.dest_address_type === AddressType.Link,
    );
    expect(assetIntent).toBeDefined();
    expect(assetIntent?.asset.address.toText()).toBe(assetPrincipal.toText());
    expect(assetIntent?.asset.network_fee).toBe(500n);
    expect(assetIntent?.asset.token_standard).toBe(TokenStandard.ICRC1);
    expect(assetIntent?.amount).toBe(999n);
    expect(assetIntent?.source_address.toText()).toBe(CREATOR.toText());
    expect(assetIntent?.source_address_type).toBe(AddressType.Creator);
    expect(assetIntent?.dest_address.toText()).toBe(
      CASHIER_BACKEND_CANISTER_ID ||
        "xybay-d2owu-tceww-zgxi4-fez55-626yd-knfze-rzeei-k2raw-6bng2-bae",
    );
  });

  it("it_should_remove_unused_token_basket_asset_placeholders", () => {
    const assetPrincipal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const result = loader.createActionFromTemplate(
      LinkType.SendTokenBasket,
      ActionType.CreateLink,
      CREATOR,
      {
        assetInfo: [
          {
            asset: {
              address: assetPrincipal,
              network_fee: 10_000n,
              token_standard: TokenStandard.ICRC2,
            },
            amount: 100_000_000n,
            label: "ICP",
          },
        ],
      },
    );
    expect(result.isOk()).toBe(true);

    const action = result.unwrap();
    const assetIntents = action.intents.filter(
      (intent) => intent.dest_address_type === AddressType.Link,
    );

    expect(assetIntents).toHaveLength(1);
    expect(assetIntents[0].asset.address.toText()).toBe(
      assetPrincipal.toText(),
    );
    expect(
      action.intents.some(
        (intent) =>
          intent.asset.address.toText() === "useor-pyaaa-aaaad-ac2ya-cai",
      ),
    ).toBe(false);
  });

  it("it_should_preserve_asset_template_placeholders_when_no_asset_info_is_supplied", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);

    const action = result.unwrap();
    const assetIntent = action.intents.find(
      (intent) => intent.dest_address_type === AddressType.Link,
    );
    expect(assetIntent).toBeDefined();
    expect(assetIntent?.amount).toBe(10_000_000_000n);
    expect(assetIntent?.dest_address.toText()).toBe(
      "xybay-d2owu-tceww-zgxi4-fez55-626yd-knfze-rzeei-k2raw-6bng2-bae",
    );
  });

  it("it_should_not_include_gate_fee_intent_without_gate_fee_options", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
    );
    expect(result.isOk()).toBe(true);

    const action = result.unwrap();
    expect(
      action.intents.some(
        (intent) => intent.dest_address_type === AddressType.Gate,
      ),
    ).toBe(false);
  });

  it("it_should_not_include_gate_fee_intent_when_gate_count_is_zero", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
      { gateCount: 0, maxUse: 3 },
    );
    expect(result.isOk()).toBe(true);

    const action = result.unwrap();
    expect(
      action.intents.some(
        (intent) => intent.dest_address_type === AddressType.Gate,
      ),
    ).toBe(false);
  });

  it("it_should_ignore_gate_fee_options_for_non_create_link_actions", () => {
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.Receive,
      CREATOR,
      { gateCount: 2, maxUse: 3 },
    );
    expect(result.isOk()).toBe(true);

    const action = result.unwrap();
    expect(action.action_type).toBe(ActionType.Receive);
    expect(
      action.intents.some(
        (intent) => intent.dest_address_type === AddressType.Gate,
      ),
    ).toBe(false);
  });

  it("it_should_append_populated_gate_fee_intent_with_gate_fee_options", () => {
    const gateCount = 2;
    const maxUse = 3;
    const result = loader.createActionFromTemplate(
      LinkType.SendTip,
      ActionType.CreateLink,
      CREATOR,
      { gateCount, maxUse },
    );
    expect(result.isOk()).toBe(true);

    const action = result.unwrap();
    const gateFeeIntent = action.intents.find(
      (intent) => intent.dest_address_type === AddressType.Gate,
    );
    expect(gateFeeIntent).toBeDefined();

    const expectedFees = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToGate,
      token_standard: TokenStandard.ICRC2,
      asset_network_fee: ICP_LEDGER_FEE,
      gate_count: gateCount,
      max_use: maxUse,
    });

    expect(gateFeeIntent?.source_address.toText()).toBe(CREATOR.toText());
    expect(gateFeeIntent?.source_address_type).toBe(AddressType.Creator);
    expect(gateFeeIntent?.dest_address.toText()).toBe(FEE_TREASURY_PRINCIPAL);
    expect(gateFeeIntent?.asset.address.toText()).toBe(
      ICP_LEDGER_CANISTER_ID || ICP_LEDGER_CANISTER_ID_FALLBACK,
    );
    expect(gateFeeIntent?.asset.network_fee).toBe(ICP_LEDGER_FEE);
    expect(gateFeeIntent?.asset.token_standard).toBe(TokenStandard.ICRC2);
    expect(gateFeeIntent?.amount).toBe(
      BigInt(expectedFees.intent_total_amount),
    );
    expect(gateFeeIntent?.total_amount).toBe(
      BigInt(expectedFees.intent_total_amount),
    );
    expect(gateFeeIntent?.network_fee).toBe(
      BigInt(expectedFees.intent_total_network_fee),
    );
    expect(gateFeeIntent?.user_fee).toBe(BigInt(expectedFees.intent_user_fee));
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
