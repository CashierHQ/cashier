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

// Import action templates - TipLink template used for TIP_SHARED_TEST
import { type ActionTemplateJson } from "$modules/actionTemplate/types";
import {
  ActionType as SharedActionType,
  LinkType as SharedLinkType,
} from "$shared";
import airdropLinkTemplates from "$sharedTemplates/airdroplink.json";
import tipLinkTemplates from "$sharedTemplates/tiplink.json";
import tokenBasketLinkTemplates from "$sharedTemplates/tokenbasketlink.json";
import { Err, Ok, Result } from "ts-results-es";

const TEMPLATE_LINK_TYPE_MAP: Record<SharedLinkType, ActionTemplateJson[]> = {
  [SharedLinkType.SendTip]: tipLinkTemplates as ActionTemplateJson[],
  [SharedLinkType.SendAirdrop]: airdropLinkTemplates as ActionTemplateJson[],
  [SharedLinkType.SendTokenBasket]:
    tokenBasketLinkTemplates as ActionTemplateJson[],
  [SharedLinkType.ReceivePayment]: [],
};

/**
 * Load action template for the given link type from actions.json.
 * Returns the first matching template or null if not found.
 */
function getTemplateForActionType(
  linkType: SharedLinkType,
  actionType: SharedActionType,
): Result<ActionTemplateJson, Error> {
  const templatesLinkType = TEMPLATE_LINK_TYPE_MAP[linkType];
  if (!templatesLinkType)
    return Err(new Error("No templates found for link type"));

  const template = templatesLinkType.find((t) => t.action_type === actionType);
  if (!template) return Err(new Error("No template found for action type"));

  return Ok(template);
}

// TODO
function parseTokenStandard(
  val?: string,
): (typeof TokenStandard)[keyof typeof TokenStandard] {
  if (val === "ICRC2") return TokenStandard.ICRC2;
  return TokenStandard.ICRC1;
}

/**
 * Create an Action instance from template, with our id and creator.
 * Intents use placeholder data where actual values are not yet known.
 */
export function createActionFromTemplate(
  linkType: SharedLinkType,
  actionType: SharedActionType,
  creator: Principal,
): Result<Action, Error> {
  const template = getTemplateForActionType(linkType, actionType);
  if (
    template.isErr() ||
    !template.value.intents ||
    template.value.intents.length < 2
  ) {
    return Err(new Error("Invalid template or intents"));
  }
  const templateValue = template.unwrap();

  // Use template structure but with our id, creator, and placeholder intents
  const intents = templateValue.intents.map((tIntent) => ({
    id: crypto.randomUUID(),
    intent_type: IntentType.Send,
    asset: {
      address: Principal.fromText(tIntent.asset?.address ?? "aaaaa-aa"),
      network_fee: tIntent.asset?.network_fee
        ? BigInt(tIntent.asset.network_fee)
        : undefined,
      token_standard: parseTokenStandard(tIntent.asset?.token_standard),
    },
    amount: BigInt(tIntent.amount ?? "0"),
    total_network_fee: tIntent.total_network_fee
      ? BigInt(tIntent.total_network_fee)
      : undefined,
    user_fee: tIntent.user_fee ? BigInt(tIntent.user_fee) : undefined,
    total_amount: tIntent.total_amount
      ? BigInt(tIntent.total_amount)
      : undefined,
    source_address: Principal.fromText(
      tIntent.source_address ?? templateValue.creator,
    ),
    source_address_type:
      tIntent.source_address_type === "Creator"
        ? AddressType.Creator
        : tIntent.source_address_type === "Treasury"
          ? AddressType.Treasury
          : tIntent.source_address_type === "User"
            ? AddressType.User
            : AddressType.Link,
    dest_address: Principal.fromText(
      tIntent.dest_address ?? templateValue.creator,
    ),
    dest_address_type:
      tIntent.dest_address_type === "Link"
        ? AddressType.Link
        : tIntent.dest_address_type === "Treasury"
          ? AddressType.Treasury
          : tIntent.dest_address_type === "User"
            ? AddressType.User
            : AddressType.Creator,
    dependencies: tIntent.dependencies ?? [],
    intent_state: IntentState.Created,
  }));

  return Ok({
    id: crypto.randomUUID(),
    creator,
    creator_address_type:
      templateValue.creator_address_type === "Creator"
        ? AddressType.Creator
        : AddressType.User,
    action_type:
      templateValue.action_type === "CreateLink"
        ? ActionType.CreateLink
        : ActionType.Receive,
    intents,
    action_state: ActionState.Created,
  });
}
