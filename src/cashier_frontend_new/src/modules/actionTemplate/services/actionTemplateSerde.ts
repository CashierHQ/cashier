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
import { Principal } from "@dfinity/principal";
import { Err, Ok, Result } from "ts-results-es";

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
    default:
      return fallback;
  }
}

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

function parseTokenStandard(value?: string): TokenStandard {
  if (value === TokenStandard.ICRC2) return TokenStandard.ICRC2;
  return TokenStandard.ICRC1;
}

function parseBigint(value: string | undefined, fallback: bigint): bigint {
  if (!value) return fallback;
  return BigInt(value);
}

function parseBigintOrUndefined(value?: string): bigint | undefined {
  return value ? BigInt(value) : undefined;
}

function parsePrincipalOrFallback(
  value: string | undefined,
  fallback: string,
): Principal {
  return Principal.fromText(value ?? fallback);
}

export function deserializeActionTemplate(
  template: ActionTemplateJson,
): Result<Action, Error> {
  try {
    const creatorText = template.creator;
    const creator = Principal.fromText(creatorText);

    const intents = template.intents.map((intent) => ({
      id: intent.id,
      intent_type: parseIntentType(intent.intent_type),
      asset: {
        address: Principal.fromText(intent.asset?.address ?? "aaaaa-aa"),
        network_fee: parseBigintOrUndefined(intent.asset?.network_fee),
        token_standard: parseTokenStandard(intent.asset?.token_standard),
      },
      amount: parseBigint(intent.amount, 0n),
      user_fee: parseBigintOrUndefined(intent.user_fee),
      total_amount: parseBigintOrUndefined(intent.total_amount),
      source_address: parsePrincipalOrFallback(
        intent.source_address,
        creatorText,
      ),
      source_address_type: parseAddressType(
        intent.source_address_type,
        AddressType.Link,
      ),
      dest_address: parsePrincipalOrFallback(intent.dest_address, creatorText),
      dest_address_type: parseAddressType(
        intent.dest_address_type,
        AddressType.Creator,
      ),
      dependencies: intent.dependencies ?? [],
      intent_state: parseIntentState(intent.intent_state),
    }));

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
    })),
    action_state: action.action_state,
  };
}
