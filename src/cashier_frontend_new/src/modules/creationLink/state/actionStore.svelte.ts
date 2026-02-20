import type { Action, Intent } from "$shared";
import {
  ActionType,
  ActionState,
  IntentState,
  AddressType,
  TokenStandard,
  IntentParticipants,
  calculateIntentFees,
} from "$shared";
import { Principal } from "@dfinity/principal";
import { createActionFromTemplate } from "$modules/creationLink/utils/actionTemplateLoader";
import type { CreateLinkData } from "$modules/creationLink/types/createLinkData";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import {
  CASHIER_BACKEND_CANISTER_ID,
  FEE_TREASURY_PRINCIPAL,
} from "$modules/shared/constants";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";

class ActionStore {
  private _action = $state<Action | null>(null);

  get action(): Action | null {
    return this._action;
  }

  // Initialize Action for CreateLink
  initializeForCreateLink(creator: Principal) {
    this._action = {
      id: crypto.randomUUID(),
      creator,
      creator_address_type: AddressType.Creator,
      action_type: ActionType.CreateLink,
      intents: [],
      action_state: ActionState.Created,
    };
  }

  /**
   * Initialize Action from template (actions.json) for V3 create flow.
   * Used for TIP_SHARED_TEST: creates action with 2 placeholder intents.
   */
  initializeFromTemplate(linkType: string, creator: Principal): boolean {
    const action = createActionFromTemplate(linkType, creator);
    if (!action) return false;
    this._action = action;
    return true;
  }

  /**
   * Update the first (asset) intent with actual selected asset data.
   * Used on step ADD_ASSET for V3 (e.g. TIP_SHARED_TEST). Sets source=Creator, dest=Link.
   */
  updateAssetIntent(params: {
    assetAddress: Principal;
    networkFee: bigint;
    tokenStandard: (typeof TokenStandard)[keyof typeof TokenStandard];
    amount: bigint;
  }): void {
    if (!this._action || this._action.intents.length === 0) return;
    const intent = this._action.intents[0];
    intent.asset = {
      address: params.assetAddress,
      network_fee: params.networkFee,
      token_standard: params.tokenStandard,
    };
    intent.amount = params.amount;
    intent.source_address = this._action.creator;
    intent.source_address_type = this._action.creator_address_type;
    intent.dest_address = Principal.fromText(CASHIER_BACKEND_CANISTER_ID);
    intent.dest_address_type = AddressType.Link;
  }

  /**
   * Update the second (fee) intent with ICP asset and link creation fee.
   * Used on step ADD_ASSET for V3 (TIP_SHARED_TEST). total_amount/network_fee/user_fee
   * are filled on Preview via updateV3IntentsWithFees.
   * @param icpNetworkFee - optional; uses ICP_LEDGER_FEE if not provided (e.g. wallet not loaded)
   */
  updateFeeIntent(icpNetworkFee?: bigint): void {
    if (!this._action || this._action.intents.length < 2) return;
    const LINK_CREATION_FEE = 10_000n;
    const icpPrincipal = Principal.fromText(ICP_LEDGER_CANISTER_ID);
    const fee = icpNetworkFee ?? ICP_LEDGER_FEE;

    const intent = this._action.intents[1];
    intent.asset = {
      address: icpPrincipal,
      network_fee: fee,
      token_standard: TokenStandard.ICRC2,
    };
    intent.amount = LINK_CREATION_FEE;
    intent.source_address = this._action.creator;
    intent.source_address_type = this._action.creator_address_type;
    intent.dest_address = Principal.fromText(FEE_TREASURY_PRINCIPAL);
    intent.dest_address_type = AddressType.Treasury;
  }

  /**
   * Update intents with calculated fees before sending to createLinkV3.
   * Used on Preview step for all link types that use v3 API (e.g. TIP_SHARED_TEST).
   * Mutates the provided intents in place.
   */
  updateV3IntentsWithFees(
    intents: Intent[],
    createLinkData: CreateLinkData,
    tokens: TokenWithPriceAndBalance[],
    creator: Principal,
    creatorAddressType: (typeof AddressType)[keyof typeof AddressType],
  ): void {
    if (intents.length < 2) return;

    const tokensMap = Object.fromEntries(tokens.map((t) => [t.address, t]));
    const maxUse = createLinkData.maxUse ?? 1;

    // Intent 0: CreatorToLink (asset funding)
    const assetData = createLinkData.assets[0];
    if (!assetData) return;

    const assetToken = tokensMap[assetData.address];
    const assetNetworkFee = assetToken?.fee ?? ICP_LEDGER_FEE;
    const assetTokenStandard =
      assetData.address === ICP_LEDGER_CANISTER_ID
        ? TokenStandard.ICRC2
        : TokenStandard.ICRC1;

    const linkFees = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToLink,
      token_standard: assetTokenStandard,
      user_input_amount: assetData.useAmount,
      max_use: maxUse,
      asset_network_fee: assetNetworkFee,
    });

    const intent0 = intents[0];
    intent0.total_amount = BigInt(linkFees.intent_total_amount);
    intent0.network_fee = BigInt(linkFees.intent_total_network_fee);
    intent0.user_fee = BigInt(linkFees.intent_user_fee);
    intent0.dest_address = Principal.fromText(CASHIER_BACKEND_CANISTER_ID);
    intent0.dest_address_type = AddressType.Link;

    // Intent 1: CreatorToTreasury (link creation fee)
    const LINK_CREATION_FEE = 10_000n;
    const icpToken = tokensMap[ICP_LEDGER_CANISTER_ID];
    const icpNetworkFee = icpToken?.fee ?? ICP_LEDGER_FEE;

    const treasuryFees = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToTreasury,
      token_standard: TokenStandard.ICRC2,
      link_creation_fee: LINK_CREATION_FEE,
      asset_network_fee: icpNetworkFee,
    });

    const intent1 = intents[1];
    intent1.asset = {
      address: Principal.fromText(ICP_LEDGER_CANISTER_ID),
      network_fee: icpNetworkFee,
      token_standard: TokenStandard.ICRC2,
    };
    intent1.amount = LINK_CREATION_FEE;
    intent1.total_amount = BigInt(treasuryFees.intent_total_amount);
    intent1.network_fee = BigInt(treasuryFees.intent_total_network_fee);
    intent1.user_fee = BigInt(treasuryFees.intent_user_fee);
    intent1.source_address = creator;
    intent1.source_address_type = creatorAddressType;
    intent1.dest_address = Principal.fromText(FEE_TREASURY_PRINCIPAL);
    intent1.dest_address_type = AddressType.Treasury;
  }

  // Add an intent to the action
  addIntent(intent: Intent) {
    if (this._action) {
      this._action.intents.push(intent);
    }
  }

  /** Replace all intents. Used when building Action for V3 create flow. */
  setIntents(intents: Intent[]) {
    if (this._action) {
      this._action.intents = intents;
    }
  }

  /** Update creator principal. Used when building Action with real user identity. */
  updateCreator(creator: Principal) {
    if (this._action) {
      this._action.creator = creator;
    }
  }

  // Update action state
  updateActionState(state: ActionState) {
    if (this._action) {
      this._action.action_state = state;
    }
  }

  // Update intent state
  updateIntentState(intentId: string, state: IntentState) {
    if (this._action) {
      const intent = this._action.intents.find((i) => i.id === intentId);
      if (intent) {
        intent.intent_state = state;
      }
    }
  }

  // Clear the action
  clear() {
    this._action = null;
  }

  // Reset for new action
  reset() {
    this.clear();
  }
}

export const actionStore = new ActionStore();
