import type { Action } from "$shared";
import { ActionState, IntentState } from "$shared";
import { Principal } from "@icp-sdk/core/principal";

// Import action templates - TipLink template used for TIP_SHARED_TEST
import { deserializeActionTemplate } from "$modules/actionTemplate/services/actionTemplateSerde";
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

export class ActionTemplateLoader {
  /**
   * Create an Action instance from template, with our id and creator.
   * Intents use placeholder data where actual values are not yet known.
   */
  createActionFromTemplate(
    linkType: SharedLinkType,
    actionType: SharedActionType,
    creator: Principal,
  ): Result<Action, Error> {
    const template = this.getTemplateForActionType(linkType, actionType);
    if (
      template.isErr() ||
      !template.value.intents ||
      template.value.intents.length === 0
    ) {
      return Err(new Error("Invalid template or intents"));
    }
    const templateValue = template.unwrap();
    const deserializedAction = deserializeActionTemplate(templateValue);
    if (deserializedAction.isErr()) {
      return Err(deserializedAction.error);
    }
    const action = deserializedAction.value;

    return Ok({
      id: crypto.randomUUID(),
      creator,
      creator_address_type: action.creator_address_type,
      action_type: action.action_type,
      intents: action.intents.map((intent) => ({
        ...intent,
        id: crypto.randomUUID(),
        intent_state: IntentState.Created,
      })),
      action_state: ActionState.Created,
    });
  }

  /**
   * Load action template for the given link type from actions.json.
   * Returns the first matching template or null if not found.
   */
  getTemplateForActionType(
    linkType: SharedLinkType,
    actionType: SharedActionType,
  ): Result<ActionTemplateJson, Error> {
    const templatesLinkType = TEMPLATE_LINK_TYPE_MAP[linkType];
    if (!templatesLinkType)
      return Err(new Error("No templates found for link type"));

    const template = templatesLinkType.find(
      (t) => t.action_type === actionType,
    );
    if (!template) return Err(new Error("No template found for action type"));

    return Ok(template);
  }
}

export const actionTemplateLoader = new ActionTemplateLoader();
