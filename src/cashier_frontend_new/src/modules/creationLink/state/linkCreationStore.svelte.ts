import { assertUnreachable } from "$lib/rsMatch";
import { createActionFromTemplate } from "$modules/actionTemplate/services/actionTemplateLoader";
import { authState } from "$modules/auth/state/auth.svelte";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";
import type { LinkCreationState } from "$modules/creationLink/state/linkCreationStates";
import { AddAssetState } from "$modules/creationLink/state/linkCreationStates/addAsset";
import { ChooseLinkTypeState } from "$modules/creationLink/state/linkCreationStates/chooseLinkType";
import { LinkCreatedState } from "$modules/creationLink/state/linkCreationStates/created";
import { PreviewState } from "$modules/creationLink/state/linkCreationStates/preview";
import { AddAssetTipLinkState } from "$modules/creationLink/state/linkCreationStates/tiplink/addAsset";
import { AddAssetTipSharedTestState } from "$modules/creationLink/state/linkCreationStates/tipSharedTest/addAsset";
import { CreateLinkData } from "$modules/creationLink/types/createLinkData";
import { createTempLinkFromPrincipalId } from "$modules/creationLink/utils/tempLink";
import Action from "$modules/links/types/action/action";
import type { Link } from "$modules/links/types/link/link";
import {
  LinkState,
  type LinkStateValue,
} from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";
import { TempLink } from "$modules/links/types/tempLink";
import {
  CASHIER_BACKEND_CANISTER_ID,
  FEE_TREASURY_PRINCIPAL,
} from "$modules/shared/constants";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import {
  AddressType as SharedAddressType,
  TokenStandard as SharedTokenStandard,
  type Action as SharedAction,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@dfinity/principal";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Store for draft link state management
 */
export class LinkCreationStore {
  // Private state variables - declare with $state at class level
  #state = $state<LinkCreationState>(new ChooseLinkTypeState(this));
  // draft holds partial data used for creation/edit flows
  public createLinkData = $state<CreateLinkData>(
    new CreateLinkData({
      title: "",
      linkType: LinkType.TIP,
      assets: [],
      maxUse: 1,
    }),
  );

  public link = $state<Link | undefined>();
  // Only existed if the link state == Created
  public action = $state<Action | undefined>();

  public link_shared = $state<SharedLink | undefined>();
  public action_shared = $state<SharedAction | undefined>();
  #id = $state<string>();

  constructor(tempLink: TempLink) {
    this.#id = tempLink.id;
    this.createLinkData = tempLink.createLinkData;
    this.#state = this.stateFromValue(tempLink.state);

    this.link = undefined;
    this.action = undefined;

    this.link_shared = undefined;
    this.action_shared = undefined;

    $effect(() => {
      // Access reactive state to track changes
      void this.createLinkData;
      void this.#state;

      // Sync on changes (async, no await needed in effect)
      this.syncTempLink();
    });
  }

  get state(): LinkCreationState {
    return this.#state;
  }

  set state(state: LinkCreationState) {
    this.#state = state;
  }

  get id(): string | undefined {
    return this.#id;
  }

  set id(id: string) {
    this.#id = id;
  }

  reset(): void {
    this.link = undefined;
    this.action = undefined;
    this.link_shared = undefined;
    this.action_shared = undefined;
  }

  // Move to the next state
  async goNext(): Promise<void> {
    await this.#state.goNext();
  }

  // Move to the previous state
  async goBack(): Promise<void> {
    await this.#state.goBack();
  }

  /**
   * Pure function derive the initial state based on the given LinkStateValue
   * @param state LinkStateValue to initialize from
   * @returns LinkCreationState corresponding to the given state
   */
  private stateFromValue(state: LinkStateValue): LinkCreationState {
    let initialState: LinkCreationState;

    switch (state) {
      case LinkState.CHOOSING_TYPE:
        initialState = new ChooseLinkTypeState(this);
        break;
      case LinkState.ADDING_ASSET:
        // choose the correct add-asset state depending on the link type
        if (this.createLinkData.linkType === LinkType.TIP) {
          initialState = new AddAssetTipLinkState(this);
        } else if (this.createLinkData.linkType === LinkType.TIP_SHARED_TEST) {
          initialState = new AddAssetTipSharedTestState(this);
        } else {
          initialState = new AddAssetState(this);
        }
        break;
      case LinkState.PREVIEW:
        initialState = new PreviewState(this);
        break;
      case LinkState.CREATE_LINK:
        initialState = new LinkCreatedState();
        break;
      default:
        initialState = new ChooseLinkTypeState(this);
    }

    return initialState;
  }

  /**
   * Create and store a new temporary link for the given principal
   * @param principalId owner principal identifier
   * @returns the created TempLink object
   */
  static createTempLink(principalId: string): TempLink {
    const tempLink = createTempLinkFromPrincipalId(principalId);

    tempLinkRepository.create({
      id: tempLink.id,
      owner: principalId,
      tempLink: tempLink,
    });

    return tempLink;
  }

  /**
   * Get a temporary link by id for the current authenticated user
   * @param id string identifier of the temp link
   * @returns the TempLink object or undefined if not found
   */
  static getTempLink(id: string): Result<TempLink, Error> {
    const owner = authState.account?.owner;
    if (!owner) return Err(new Error("User not authenticated"));
    const tempLink = tempLinkRepository.getOne(owner, id);
    if (!tempLink) {
      return Err(new Error(`Temp link with id ${id} not found`));
    }
    return Ok(tempLink);
  }

  /**
   * Persist the current state of the draft link state to the local storage using tempLinkRepository
   * @returns
   */
  syncTempLink(): void {
    if (this.#state.step === LinkStep.CREATED) {
      return;
    }

    let currentLinkState: LinkStateValue;
    switch (this.#state.step) {
      case LinkStep.CHOOSE_TYPE:
        currentLinkState = LinkState.CHOOSING_TYPE;
        break;
      case LinkStep.ADD_ASSET:
        currentLinkState = LinkState.ADDING_ASSET;
        break;
      case LinkStep.PREVIEW:
        currentLinkState = LinkState.PREVIEW;
        break;
      case LinkStep.ACTIVE:
      case LinkStep.INACTIVE:
      case LinkStep.ENDED:
        throw new Error(
          "LinkCreationStore cannot transition to ACTIVE, INACTIVE or ENDED",
        );
      default:
        assertUnreachable(this.#state.step);
    }

    if (this.#id && currentLinkState && authState.account) {
      tempLinkRepository.update({
        id: this.#id,
        updateTempLink: {
          state: currentLinkState,
          createLinkData: this.createLinkData,
        },
        owner: authState.account.owner,
      });
    }
  }

  /**
   * Initialize Action from template (actions.json) for V3 create flow.
   * Used for TIP_SHARED_TEST: creates action with 2 placeholder intents.
   */
  initializeActionFromTemplate(
    linkType: string,
    actionType: string,
    creator: Principal,
  ): boolean {
    const loaded_action: SharedAction | undefined = createActionFromTemplate(
      linkType,
      actionType,
      creator,
    );
    if (!loaded_action) return false;
    this.action_shared = loaded_action;
    return true;
  }

  /**
   * Update the first (asset) intent with actual selected asset data.
   * Used on step ADD_ASSET for V3 (e.g. TIP_SHARED_TEST). Sets source=Creator, dest=Link.
   */
  updateAssetIntent(params: {
    assetAddress: Principal;
    networkFee: bigint;
    tokenStandard: (typeof SharedTokenStandard)[keyof typeof SharedTokenStandard];
    amount: bigint;
  }): void {
    if (!this.action_shared || this.action_shared.intents.length === 0) return;
    const intent = this.action_shared.intents[0];
    intent.asset = {
      address: params.assetAddress,
      network_fee: params.networkFee,
      token_standard: params.tokenStandard,
    };
    intent.amount = params.amount;
    intent.source_address = this.action_shared.creator;
    intent.source_address_type = this.action_shared.creator_address_type;
    intent.dest_address = Principal.fromText(CASHIER_BACKEND_CANISTER_ID);
    intent.dest_address_type = SharedAddressType.Link;
  }

  /**
   * Update the second (fee) intent with ICP asset and link creation fee.
   * Used on step ADD_ASSET for V3 (TIP_SHARED_TEST). total_amount/network_fee/user_fee
   * are filled on Preview via updateV3IntentsWithFees.
   * @param icpNetworkFee - optional; uses ICP_LEDGER_FEE if not provided (e.g. wallet not loaded)
   */
  updateFeeIntent(icpNetworkFee?: bigint): void {
    if (!this.action_shared || this.action_shared.intents.length < 2) return;
    const LINK_CREATION_FEE = 10_000n;
    const icpPrincipal = Principal.fromText(ICP_LEDGER_CANISTER_ID);
    const fee = icpNetworkFee ?? ICP_LEDGER_FEE;

    const intent = this.action_shared.intents[1];
    intent.asset = {
      address: icpPrincipal,
      network_fee: fee,
      token_standard: SharedTokenStandard.ICRC2,
    };
    intent.amount = LINK_CREATION_FEE;
    intent.source_address = this.action_shared.creator;
    intent.source_address_type = this.action_shared.creator_address_type;
    intent.dest_address = Principal.fromText(FEE_TREASURY_PRINCIPAL);
    intent.dest_address_type = SharedAddressType.Treasury;
  }
}
