import {
  deserializeActionTemplate,
  serializeActionTemplate,
} from "$modules/actionTemplate/services/actionTemplateSerde";
import type { ActionTemplateJson } from "$modules/actionTemplate/types";
import type { Action } from "$shared";
import {
  ActionState,
  ActionType,
  AddressType,
  IntentState,
  IntentType,
  TokenStandard,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { describe, expect, it } from "vitest";

const VALID_PRINCIPAL_TEXT = "aaaaa-aa";
const VALID_PRINCIPAL = Principal.fromText(VALID_PRINCIPAL_TEXT);

function makeValidTemplate(
  overrides?: Partial<ActionTemplateJson>,
): ActionTemplateJson {
  return {
    id: "action-1",
    creator: VALID_PRINCIPAL_TEXT,
    creator_address_type: AddressType.Creator,
    action_type: ActionType.Send,
    action_state: ActionState.Created,
    intents: [
      {
        id: "intent-1",
        intent_type: IntentType.Send,
        asset: {
          address: VALID_PRINCIPAL_TEXT,
          network_fee: "100",
          token_standard: TokenStandard.ICRC1,
        },
        amount: "1000",
        user_fee: "10",
        total_amount: "1010",
        source_address: VALID_PRINCIPAL_TEXT,
        source_address_type: AddressType.Creator,
        dest_address: VALID_PRINCIPAL_TEXT,
        dest_address_type: AddressType.Link,
        dependencies: [],
        intent_state: IntentState.Created,
      },
    ],
    ...overrides,
  };
}

function makeValidAction(overrides?: Partial<Action>): Action {
  return {
    id: "action-1",
    creator: VALID_PRINCIPAL,
    creator_address_type: AddressType.Creator,
    action_type: ActionType.Send,
    action_state: ActionState.Created,
    intents: [
      {
        id: "intent-1",
        intent_type: IntentType.Send,
        asset: {
          address: VALID_PRINCIPAL,
          network_fee: 100n,
          token_standard: TokenStandard.ICRC1,
        },
        amount: 1000n,
        user_fee: 10n,
        total_amount: 1010n,
        source_address: VALID_PRINCIPAL,
        source_address_type: AddressType.Creator,
        dest_address: VALID_PRINCIPAL,
        dest_address_type: AddressType.Link,
        dependencies: [],
        intent_state: IntentState.Created,
      },
    ],
    ...overrides,
  };
}

describe("deserializeActionTemplate", () => {
  it("it_should_fail_deserialize_due_to_invalid_creator_principal", () => {
    const template = makeValidTemplate({ creator: "not-a-valid-principal" });
    const result = deserializeActionTemplate(template);
    expect(result.isErr()).toBe(true);
  });

  it("it_should_fail_deserialize_due_to_unknown_action_type", () => {
    const template = makeValidTemplate({
      action_type: "UnknownType" as ActionType,
    });
    const result = deserializeActionTemplate(template);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toContain(
      "Unknown action type",
    );
  });

  it("it_should_fail_deserialize_due_to_unknown_intent_type", () => {
    const template = makeValidTemplate();
    template.intents[0] = {
      ...template.intents[0],
      intent_type: "UnknownIntentType" as IntentType,
    };
    const result = deserializeActionTemplate(template);
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.message).toContain(
      "Unknown intent type",
    );
  });

  it("it_should_succeed_deserialize_valid_template", () => {
    const template = makeValidTemplate();
    const result = deserializeActionTemplate(template);
    expect(result.isOk()).toBe(true);

    const action = result.unwrap();
    expect(action.id).toBe("action-1");
    expect(action.creator.toText()).toBe(VALID_PRINCIPAL_TEXT);
    expect(action.creator_address_type).toBe(AddressType.Creator);
    expect(action.action_type).toBe(ActionType.Send);
    expect(action.action_state).toBe(ActionState.Created);

    const intent = action.intents[0];
    expect(intent.id).toBe("intent-1");
    expect(intent.intent_type).toBe(IntentType.Send);
    expect(intent.asset.address.toText()).toBe(VALID_PRINCIPAL_TEXT);
    expect(intent.asset.network_fee).toBe(100n);
    expect(intent.asset.token_standard).toBe(TokenStandard.ICRC1);
    expect(intent.amount).toBe(1000n);
    expect(intent.user_fee).toBe(10n);
    expect(intent.total_amount).toBe(1010n);
    expect(intent.source_address.toText()).toBe(VALID_PRINCIPAL_TEXT);
    expect(intent.source_address_type).toBe(AddressType.Creator);
    expect(intent.dest_address.toText()).toBe(VALID_PRINCIPAL_TEXT);
    expect(intent.dest_address_type).toBe(AddressType.Link);
    expect(intent.dependencies).toEqual([]);
    expect(intent.intent_state).toBe(IntentState.Created);
  });

  it("it_should_succeed_deserialize_all_action_states", () => {
    for (const state of [
      ActionState.Processing,
      ActionState.Success,
      ActionState.Fail,
    ]) {
      const result = deserializeActionTemplate(
        makeValidTemplate({ action_state: state }),
      );
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().action_state).toBe(state);
    }
  });

  it("it_should_succeed_deserialize_with_action_state_defaulting_to_created", () => {
    const template = makeValidTemplate({
      action_state: "UnknownState" as ActionState,
    });
    const result = deserializeActionTemplate(template);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().action_state).toBe(ActionState.Created);
  });

  it("it_should_succeed_deserialize_with_intent_state_defaulting_to_created", () => {
    const template = makeValidTemplate();
    template.intents[0] = {
      ...template.intents[0],
      intent_state: "UnknownState" as IntentState,
    };
    const result = deserializeActionTemplate(template);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().intents[0].intent_state).toBe(IntentState.Created);
  });

  it("it_should_succeed_deserialize_with_address_type_fallback_for_unknown_values", () => {
    const template = makeValidTemplate({
      creator_address_type: "UnknownType" as AddressType,
    });
    template.intents[0] = {
      ...template.intents[0],
      source_address_type: "UnknownType" as AddressType,
      dest_address_type: "UnknownType" as AddressType,
    };
    const result = deserializeActionTemplate(template);
    expect(result.isOk()).toBe(true);
    const action = result.unwrap();
    expect(action.creator_address_type).toBe(AddressType.User);
    expect(action.intents[0].source_address_type).toBe(AddressType.Link);
    expect(action.intents[0].dest_address_type).toBe(AddressType.Creator);
  });

  it("it_should_succeed_deserialize_with_token_standard_defaulting_to_icrc2", () => {
    const template = makeValidTemplate();
    template.intents[0] = {
      ...template.intents[0],
      asset: {
        ...template.intents[0].asset,
        token_standard: "Unknown" as TokenStandard,
      },
    };
    const result = deserializeActionTemplate(template);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().intents[0].asset.token_standard).toBe(
      TokenStandard.ICRC2,
    );
  });

  it("it_should_succeed_deserialize_with_undefined_for_missing_optional_bigint_fields", () => {
    const template = makeValidTemplate();
    template.intents[0] = {
      ...template.intents[0],
      user_fee: undefined,
      total_amount: undefined,
      asset: { address: VALID_PRINCIPAL_TEXT, network_fee: undefined },
    };
    const result = deserializeActionTemplate(template);
    expect(result.isOk()).toBe(true);
    const intent = result.unwrap().intents[0];
    expect(intent.user_fee).toBeUndefined();
    expect(intent.total_amount).toBeUndefined();
    expect(intent.asset.network_fee).toBeUndefined();
  });

  it("it_should_succeed_deserialize_with_creator_as_fallback_for_missing_addresses", () => {
    const template = makeValidTemplate();
    template.intents[0] = {
      ...template.intents[0],
      source_address: undefined as unknown as string,
      dest_address: undefined as unknown as string,
    };
    const result = deserializeActionTemplate(template);
    expect(result.isOk()).toBe(true);
    const intent = result.unwrap().intents[0];
    expect(intent.source_address.toText()).toBe(VALID_PRINCIPAL_TEXT);
    expect(intent.dest_address.toText()).toBe(VALID_PRINCIPAL_TEXT);
  });
});

describe("serializeActionTemplate", () => {
  it("it_should_succeed_serialize_valid_action", () => {
    const action = makeValidAction();
    const json = serializeActionTemplate(action);

    expect(json.id).toBe("action-1");
    expect(json.creator).toBe(VALID_PRINCIPAL_TEXT);
    expect(json.creator_address_type).toBe(AddressType.Creator);
    expect(json.action_type).toBe(ActionType.Send);
    expect(json.action_state).toBe(ActionState.Created);

    const intent = json.intents[0];
    expect(intent.id).toBe("intent-1");
    expect(intent.intent_type).toBe(IntentType.Send);
    expect(intent.asset.address).toBe(VALID_PRINCIPAL_TEXT);
    expect(intent.asset.network_fee).toBe("100");
    expect(intent.asset.token_standard).toBe(TokenStandard.ICRC1);
    expect(intent.amount).toBe("1000");
    expect(intent.user_fee).toBe("10");
    expect(intent.total_amount).toBe("1010");
    expect(intent.source_address).toBe(VALID_PRINCIPAL_TEXT);
    expect(intent.source_address_type).toBe(AddressType.Creator);
    expect(intent.dest_address).toBe(VALID_PRINCIPAL_TEXT);
    expect(intent.dest_address_type).toBe(AddressType.Link);
    expect(intent.dependencies).toEqual([]);
    expect(intent.intent_state).toBe(IntentState.Created);
  });

  it("it_should_succeed_serialize_with_undefined_optional_fields_as_undefined", () => {
    const action = makeValidAction();
    action.intents[0] = {
      ...action.intents[0],
      user_fee: undefined,
      total_amount: undefined,
      network_fee: undefined,
      asset: { ...action.intents[0].asset, network_fee: undefined },
    };
    const json = serializeActionTemplate(action);
    const intent = json.intents[0];

    expect(intent.user_fee).toBeUndefined();
    expect(intent.total_amount).toBeUndefined();
    expect(intent.total_network_fee).toBeUndefined();
    expect(intent.asset.network_fee).toBeUndefined();
  });

  it("it_should_succeed_serialize_intent_network_fee_as_total_network_fee", () => {
    const action = makeValidAction();
    action.intents[0] = { ...action.intents[0], network_fee: 50n };
    const json = serializeActionTemplate(action);
    expect(json.intents[0].total_network_fee).toBe("50");
  });
});
