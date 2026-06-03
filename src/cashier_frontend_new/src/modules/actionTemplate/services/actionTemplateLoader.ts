import {
  ActionState,
  ActionType as SharedActionType,
  AddressType as SharedAddressType,
  calculateIntentFees,
  IntentParticipants,
  IntentState,
  LinkType as SharedLinkType,
  TokenStandard as SharedTokenStandard,
  type Action,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";

// Import action templates - TipLink template used for TIP_SHARED_TEST
import { deserializeActionTemplate } from "$modules/actionTemplate/services/actionTemplateSerde";
import {
  type ActionTemplateJson,
  type IntentTemplateJson,
} from "$modules/actionTemplate/types";
import { FEE_TREASURY_PRINCIPAL } from "$modules/shared/constants";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import airdropLinkTemplates from "$sharedTemplates/links/airdroplink.json";
import gateFeeIntentTemplate from "$sharedTemplates/intents/gatefee.json";
import tipLinkTemplates from "$sharedTemplates/links/tiplink.json";
import tokenBasketLinkTemplates from "$sharedTemplates/links/tokenbasketlink.json";
import { Err, Ok, Result } from "ts-results-es";

const TEMPLATE_LINK_TYPE_MAP: Record<SharedLinkType, ActionTemplateJson[]> = {
  [SharedLinkType.SendTip]: tipLinkTemplates as ActionTemplateJson[],
  [SharedLinkType.SendAirdrop]: airdropLinkTemplates as ActionTemplateJson[],
  [SharedLinkType.SendTokenBasket]:
    tokenBasketLinkTemplates as ActionTemplateJson[],
  [SharedLinkType.ReceivePayment]: [],
};

interface GateFeeIntentOptions {
  gateCount: number;
  maxUse: number;
}

export class ActionTemplateLoader {
  /**
   * Creates a draft action from the static template for a link type and action type.
   *
   * The returned action receives fresh IDs and the supplied creator. When gate fee
   * options are provided for a CreateLink action, a populated CreatorToGate fee
   * intent is appended for frontend preview rendering.
   *
   * @param linkType Link type whose action template should be loaded.
   * @param actionType Action type to create from the selected link template.
   * @param creator Principal that owns the draft action.
   * @param gateFeeOptions Optional gate count and max-use context for adding a gate fee intent.
   * @returns The populated draft action, or an error if the template cannot be loaded or deserialized.
   */
  createActionFromTemplate(
    linkType: SharedLinkType,
    actionType: SharedActionType,
    creator: Principal,
    gateFeeOptions?: GateFeeIntentOptions,
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
    const templateAction = deserializedAction.value;

    const action: Action = {
      id: crypto.randomUUID(),
      creator,
      creator_address_type: templateAction.creator_address_type,
      action_type: templateAction.action_type,
      intents: templateAction.intents.map((intent) => ({
        ...intent,
        id: crypto.randomUUID(),
        intent_state: IntentState.Created,
      })),
      action_state: ActionState.Created,
    };

    if (
      actionType === SharedActionType.CreateLink &&
      gateFeeOptions &&
      gateFeeOptions.gateCount > 0
    ) {
      const gateIntentResult = this.createGateFeeIntent(action, gateFeeOptions);
      if (gateIntentResult.isErr()) {
        return Err(gateIntentResult.error);
      }
      action.intents.push(gateIntentResult.value);
    }

    return Ok(action);
  }

  /**
   * Finds the static action template for a link type and action type.
   *
   * @param linkType Link type whose template collection should be searched.
   * @param actionType Action type to find within the template collection.
   * @returns The matching JSON action template, or an error when the link type or action type is unsupported.
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

  /**
   * Creates and populates a gate-fee intent from the shared gate-fee intent template.
   *
   * Fee amounts are calculated by the shared package. This method only supplies
   * action context, addresses, token metadata, and the calculated fee fields.
   *
   * @param action Draft CreateLink action that will receive the gate-fee intent.
   * @param options Gate count and max-use values used by shared fee calculation.
   * @returns A populated CreatorToGate intent, or an error if the intent template cannot be deserialized.
   */
  private createGateFeeIntent(
    action: Action,
    options: GateFeeIntentOptions,
  ): Result<Action["intents"][number], Error> {
    const gateTemplateAction = deserializeActionTemplate({
      id: action.id,
      creator: action.creator.toText(),
      creator_address_type: action.creator_address_type,
      action_type: action.action_type,
      intents: [gateFeeIntentTemplate as IntentTemplateJson],
      action_state: ActionState.Created,
    });
    if (gateTemplateAction.isErr()) {
      return Err(gateTemplateAction.error);
    }

    const gateIntent = gateTemplateAction.value.intents[0];
    if (!gateIntent) {
      return Err(new Error("Gate fee intent template not found"));
    }

    const intentFees = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToGate,
      token_standard: SharedTokenStandard.ICRC2,
      asset_network_fee: ICP_LEDGER_FEE,
      gate_count: options.gateCount,
      max_use: options.maxUse,
    });
    const icpLedgerCanisterId =
      ICP_LEDGER_CANISTER_ID || gateIntent.asset.address.toText();

    gateIntent.id = crypto.randomUUID();
    gateIntent.intent_state = IntentState.Created;
    gateIntent.asset = {
      address: Principal.fromText(icpLedgerCanisterId),
      network_fee: ICP_LEDGER_FEE,
      token_standard: SharedTokenStandard.ICRC2,
    };
    gateIntent.amount = BigInt(intentFees.intent_total_amount);
    gateIntent.total_amount = BigInt(intentFees.intent_total_amount);
    gateIntent.network_fee = BigInt(intentFees.intent_total_network_fee);
    gateIntent.user_fee = BigInt(intentFees.intent_user_fee);
    gateIntent.source_address = action.creator;
    gateIntent.source_address_type = action.creator_address_type;
    gateIntent.dest_address = Principal.fromText(FEE_TREASURY_PRINCIPAL);
    gateIntent.dest_address_type = SharedAddressType.Gate;
    gateIntent.dependencies = [];

    return Ok(gateIntent);
  }
}

export const actionTemplateLoader = new ActionTemplateLoader();
