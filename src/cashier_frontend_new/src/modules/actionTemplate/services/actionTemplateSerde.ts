import type {
  ActionTemplateJson,
  IntentTemplateJson,
} from "$modules/actionTemplate/types";
import type { Action, Intent } from "$shared";
import {
  ActionState,
  ActionType,
  AddressType,
  IntentState,
  IntentType,
  TokenStandard,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { Err, Ok, Result } from "ts-results-es";

/**
 * Deserializes a standalone intent JSON template into a shared Intent.
 *
 * The creator fallback is used when source or destination addresses are absent
 * from the template.
 *
 * @param template JSON intent template to deserialize.
 * @param creatorFallback Principal used as fallback for missing intent addresses.
 * @returns The parsed intent, or an error when required fields cannot be parsed.
 */
export function deserializeIntentTemplate(
  template: IntentTemplateJson,
  creatorFallback: Principal,
): Result<Intent, Error> {
  try {
    const creatorText = creatorFallback.toText();

    return Ok({
      id: template.id,
      intent_type: parseIntentType(template.intent_type),
      asset: {
        address: Principal.fromText(template.asset?.address ?? "aaaaa-aa"),
        network_fee: parseBigintOrUndefined(template.asset?.network_fee),
        token_standard: parseTokenStandard(template.asset?.token_standard),
      },
      amount: parseBigint(template.amount, 0n),
      user_fee: parseBigintOrUndefined(template.user_fee),
      total_amount: parseBigintOrUndefined(template.total_amount),
      network_fee: parseBigintOrUndefined(template.total_network_fee),
      source_address: parsePrincipalOrFallback(
        template.source_address,
        creatorText,
      ),
      source_address_type: parseAddressType(
        template.source_address_type,
        AddressType.Link,
      ),
      dest_address: parsePrincipalOrFallback(
        template.dest_address,
        creatorText,
      ),
      dest_address_type: parseAddressType(
        template.dest_address_type,
        AddressType.Creator,
      ),
      dependencies: template.dependencies ?? [],
      intent_state: parseIntentState(template.intent_state),
      label: template.label,
    });
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to deserialize intent template"),
    );
  }
}

/**
 * Deserialize an ActionTemplateJson into an Action instance.
 * This is used to convert our static JSON templates into actual Action objects we can work with.
 * @param template
 * @returns
 */
export function deserializeActionTemplate(
  template: ActionTemplateJson,
): Result<Action, Error> {
  try {
    const creatorText = template.creator;
    const creator = Principal.fromText(creatorText);
    const intents: Intent[] = [];
    for (const intentTemplate of template.intents) {
      const intent = deserializeIntentTemplate(intentTemplate, creator);
      if (intent.isErr()) return Err(intent.error);
      intents.push(intent.value);
    }

    return Ok({
      id: template.id,
      creator,
      creator_address_type: parseAddressType(
        template.creator_address_type,
        AddressType.User,
      ),
      action_type: parseActionType(template.action_type),
      intents,
      action_state:
        template.action_state === ActionState.Processing
          ? ActionState.Processing
          : template.action_state === ActionState.Success
            ? ActionState.Success
            : template.action_state === ActionState.Fail
              ? ActionState.Fail
              : ActionState.Created,
    });
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to deserialize action template"),
    );
  }
}

/**
 * Serialize an Action instance into an ActionTemplateJson.
 * This is used to convert our Action objects back into a JSON format that can be saved or transmitted.
 * @param action
 * @returns
 */
export function serializeActionTemplate(action: Action): ActionTemplateJson {
  return {
    id: action.id,
    creator: action.creator.toText(),
    creator_address_type: action.creator_address_type,
    action_type: action.action_type,
    intents: action.intents.map((intent) => ({
      id: intent.id,
      intent_type: intent.intent_type,
      asset: {
        address: intent.asset.address.toText(),
        network_fee: intent.asset.network_fee?.toString(),
        token_standard: intent.asset.token_standard,
      },
      amount: intent.amount.toString(),
      total_network_fee: intent.network_fee?.toString(),
      user_fee: intent.user_fee?.toString(),
      total_amount: intent.total_amount?.toString(),
      source_address: intent.source_address.toText(),
      source_address_type: intent.source_address_type,
      dest_address: intent.dest_address.toText(),
      dest_address_type: intent.dest_address_type,
      dependencies: intent.dependencies ?? [],
      intent_state: intent.intent_state,
      label: intent.label,
    })),
    action_state: action.action_state,
  };
}

/**
 * Parse a string into an ActionType enum value. Throws an error if the value is not recognized.
 * @param value
 * @returns
 */
function parseActionType(value: string | undefined): ActionType {
  switch (value) {
    case ActionType.CreateLink:
      return ActionType.CreateLink;
    case ActionType.Withdraw:
      return ActionType.Withdraw;
    case ActionType.Send:
      return ActionType.Send;
    case ActionType.Receive:
      return ActionType.Receive;
    default:
      throw new Error(`Unknown action type: ${value ?? "<undefined>"}`);
  }
}

/**
 * Parse a string into an AddressType enum value, with a fallback if the value is not recognized.
 * @param value
 * @param fallback
 * @returns
 */
function parseAddressType(
  value: string | undefined,
  fallback: AddressType,
): AddressType {
  switch (value) {
    case AddressType.Creator:
      return AddressType.Creator;
    case AddressType.Treasury:
      return AddressType.Treasury;
    case AddressType.User:
      return AddressType.User;
    case AddressType.Link:
      return AddressType.Link;
    case AddressType.Gate:
      return AddressType.Gate;
    default:
      return fallback;
  }
}

/**
 * Parse a string into an IntentType enum value. Throws an error if the value is not recognized.
 * @param value
 * @returns
 */
function parseIntentType(value: string | undefined): IntentType {
  switch (value) {
    case IntentType.Send:
      return IntentType.Send;
    case IntentType.Receive:
      return IntentType.Receive;
    default:
      throw new Error(`Unknown intent type: ${value ?? "<undefined>"}`);
  }
}

/**
 * Parse a string into an IntentState enum value, with a default of Created if the value is not recognized.
 * @param value
 * @returns
 */
function parseIntentState(value: string | undefined): IntentState {
  switch (value) {
    case IntentState.Created:
      return IntentState.Created;
    case IntentState.Processing:
      return IntentState.Processing;
    case IntentState.Success:
      return IntentState.Success;
    case IntentState.Fail:
      return IntentState.Fail;
    default:
      return IntentState.Created;
  }
}

/**
 * Parse a string into a TokenStandard enum value, with a default of ICRC2 if the value is not recognized.
 * @param value
 * @returns
 */
function parseTokenStandard(value?: string): TokenStandard {
  switch (value) {
    case TokenStandard.ICRC2:
      return TokenStandard.ICRC2;
    case TokenStandard.ICRC1:
      return TokenStandard.ICRC1;
    default:
      return TokenStandard.ICRC2;
  }
}

function parseBigint(value: string | undefined, fallback: bigint): bigint {
  if (!value) return fallback;
  return BigInt(value);
}

/**
 * Parse a string into a bigint value, with a fallback if the value is not recognized.
 * @param value
 * @param fallback
 * @returns
 */
function parseBigintOrUndefined(value?: string): bigint | undefined {
  return value ? BigInt(value) : undefined;
}

/**
 * Parse a string into a Principal value, with a fallback if the value is not recognized.
 * @param value
 * @param fallback
 * @returns
 */
function parsePrincipalOrFallback(
  value: string | undefined,
  fallback: string,
): Principal {
  return Principal.fromText(value ?? fallback);
}
