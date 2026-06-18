import {
  deserializeActionTemplate,
  deserializeIntentTemplate,
} from "$modules/actionTemplate/services/actionTemplateSerde";
import {
  type ActionTemplateJson,
  type CreateActionTemplateOptions,
  type GateFeeIntentOptions,
  type IntentTemplateJson,
} from "$modules/actionTemplate/types";
import {
  CASHIER_BACKEND_CANISTER_ID,
  FEE_TREASURY_PRINCIPAL,
} from "$modules/shared/constants";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import {
  ActionState,
  calculateIntentFees,
  getLinkCreationFeeAmount,
  IntentParticipants,
  IntentState,
  ActionType as SharedActionType,
  AddressType as SharedAddressType,
  LinkType as SharedLinkType,
  TokenStandard as SharedTokenStandard,
  type Action,
  type AssetInfo,
  type Intent,
} from "$shared";
import gateFeeIntentTemplate from "$sharedTemplates/intents/gatefee.json";
import linkCreationFeeIntentTemplate from "$sharedTemplates/intents/linkCreationFee.json";
import airdropLinkTemplates from "$sharedTemplates/links/airdroplink.json";
import tipLinkTemplates from "$sharedTemplates/links/tiplink.json";
import tokenBasketLinkTemplates from "$sharedTemplates/links/tokenbasketlink.json";
import { Principal } from "@icp-sdk/core/principal";
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
   * Creates a draft action from the static template for a link type and action type.
   *
   * The returned action receives fresh IDs and the supplied creator. For
   * CreateLink actions, selected assets are populated into CreatorToLink
   * intents, a populated link creation fee intent is appended, and an optional
   * gate fee intent is appended when gate options indicate a gated link.
   *
   * @param linkType Link type whose action template should be loaded.
   * @param actionType Action type to create from the selected link template.
   * @param creator Principal that owns the draft action.
   * @param options Optional CreateLink context used to populate selected assets and dynamic fee intents.
   * @returns The populated draft action, or an error if the template cannot be loaded or deserialized.
   */
  createActionFromTemplate(
    linkType: SharedLinkType,
    actionType: SharedActionType,
    creator: Principal,
    options?: CreateActionTemplateOptions,
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

    if (actionType === SharedActionType.CreateLink) {
      const populateAssetResult = this.populateAssetIntents(
        action,
        options?.assetInfo,
      );
      if (populateAssetResult.isErr()) {
        return Err(populateAssetResult.error);
      }

      const linkCreationFeeIntentResult =
        this.createLinkCreationFeeIntent(action);
      if (linkCreationFeeIntentResult.isErr()) {
        return Err(linkCreationFeeIntentResult.error);
      }
      action.intents.push(linkCreationFeeIntentResult.unwrap());
    }

    if (
      actionType === SharedActionType.CreateLink &&
      options?.gateCount &&
      options.gateCount > 0
    ) {
      const gateIntentResult = this.createGateFeeIntent(action, {
        gateCount: options.gateCount,
        maxUse: options.maxUse ?? 1,
      });
      if (gateIntentResult.isErr()) {
        return Err(gateIntentResult.error);
      }
      action.intents.push(gateIntentResult.unwrap());
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
  ): Result<Intent, Error> {
    const gateIntentResult = deserializeIntentTemplate(
      gateFeeIntentTemplate as IntentTemplateJson,
      action.creator,
    );
    if (gateIntentResult.isErr()) {
      return Err(gateIntentResult.error);
    }

    const gateIntent = gateIntentResult.value;

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

  /**
   * Populates CreatorToLink asset intents with user-selected draft link assets.
   *
   * The method preserves the existing create-link behavior: when no asset info is
   * supplied, template placeholders remain unchanged. When assets are supplied,
   * each selected asset populates the corresponding template intent by index.
   *
   * @param action Draft CreateLink action whose asset intents should be populated.
   * @param assetInfo Selected assets from the draft link.
   * @returns Success when asset intents are populated or intentionally left unchanged, otherwise an error.
   */
  private populateAssetIntents(
    action: Action,
    assetInfo?: AssetInfo[],
  ): Result<void, Error> {
    if (!assetInfo || assetInfo.length === 0) {
      return Ok(undefined);
    }

    const intents = action.intents.filter(
      (intent) =>
        intent.source_address_type === SharedAddressType.Creator &&
        intent.dest_address_type === SharedAddressType.Link,
    );
    if (intents.length === 0) {
      return Err(new Error("Asset intent not found in action intents"));
    }

    const linkCanisterId =
      CASHIER_BACKEND_CANISTER_ID || intents[0].dest_address.toText();
    const linkAddress = Principal.fromText(linkCanisterId);
    const populatedIntentCount = Math.min(intents.length, assetInfo.length);

    for (let i = 0; i < populatedIntentCount; i++) {
      const linkAssetInfo = assetInfo[i];
      const intent = intents[i];
      intent.asset = {
        address: linkAssetInfo.asset.address,
        network_fee: linkAssetInfo.asset.network_fee,
        token_standard: linkAssetInfo.asset.token_standard,
      };
      intent.amount = linkAssetInfo.amount;
      intent.source_address = action.creator;
      intent.source_address_type = action.creator_address_type;
      intent.dest_address = linkAddress;
      intent.dest_address_type = SharedAddressType.Link;
      intent.label = `${intent.label}_${linkAssetInfo.asset.address.toText()}`;
    }

    const unusedTemplateIntents = intents.slice(populatedIntentCount);
    action.intents = action.intents.filter(
      (intent) => !unusedTemplateIntents.includes(intent),
    );

    return Ok(undefined);
  }

  /**
   * Creates and populates the link creation fee intent from its standalone template.
   *
   * Fee amounts are calculated by the shared package. This method only supplies
   * action context, addresses, ICP metadata, and the calculated fee fields.
   *
   * @param action Draft CreateLink action that will receive the link creation fee intent.
   * @returns A populated CreatorToTreasury intent, or an error if the intent template cannot be deserialized.
   */
  private createLinkCreationFeeIntent(action: Action): Result<Intent, Error> {
    const linkCreationFeeIntentResult = deserializeIntentTemplate(
      linkCreationFeeIntentTemplate as IntentTemplateJson,
      action.creator,
    );
    if (linkCreationFeeIntentResult.isErr()) {
      return Err(linkCreationFeeIntentResult.error);
    }

    const linkCreationFeeIntent = linkCreationFeeIntentResult.value;

    const intentFees = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToTreasury,
      token_standard: SharedTokenStandard.ICRC2,
      asset_network_fee: ICP_LEDGER_FEE,
      link_creation_fee: getLinkCreationFeeAmount(),
    });
    const icpLedgerCanisterId =
      ICP_LEDGER_CANISTER_ID || linkCreationFeeIntent.asset.address.toText();

    linkCreationFeeIntent.id = crypto.randomUUID();
    linkCreationFeeIntent.intent_state = IntentState.Created;
    linkCreationFeeIntent.asset = {
      address: Principal.fromText(icpLedgerCanisterId),
      network_fee: ICP_LEDGER_FEE,
      token_standard: SharedTokenStandard.ICRC2,
    };
    linkCreationFeeIntent.amount = BigInt(intentFees.intent_total_amount);
    linkCreationFeeIntent.total_amount = BigInt(intentFees.intent_total_amount);
    linkCreationFeeIntent.network_fee = BigInt(
      intentFees.intent_total_network_fee,
    );
    linkCreationFeeIntent.user_fee = BigInt(intentFees.intent_user_fee);
    linkCreationFeeIntent.source_address = action.creator;
    linkCreationFeeIntent.source_address_type = action.creator_address_type;
    linkCreationFeeIntent.dest_address = Principal.fromText(
      FEE_TREASURY_PRINCIPAL,
    );
    linkCreationFeeIntent.dest_address_type = SharedAddressType.Treasury;
    linkCreationFeeIntent.dependencies = [];

    return Ok(linkCreationFeeIntent);
  }
}

export const actionTemplateLoader = new ActionTemplateLoader();
