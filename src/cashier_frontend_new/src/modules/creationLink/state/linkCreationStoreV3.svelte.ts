import { assertUnreachable } from "$lib/rsMatch";
import { createActionFromTemplate } from "$modules/actionTemplate/services/actionTemplateLoader";
import { authState } from "$modules/auth/state/auth.svelte";
import { draftLinkService } from "$modules/creationLink/services/draftLink";
import type { LinkCreationStateV3 } from "$modules/creationLink/state/linkCreationStatesV3";
import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import { ChooseLinkTypeStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/chooseLinkType";
import { LinkCreatedStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/created";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import { type Icrc112Requests } from "$modules/icrc112/types/icrc112Request";
import { LinkStep } from "$modules/links/types/linkStep";
import {
  CASHIER_BACKEND_CANISTER_ID,
  FEE_TREASURY_PRINCIPAL,
  LINK_CREATION_FEE,
} from "$modules/shared/constants";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { TokenStandard } from "$modules/token/types/tokenStandard";
import {
  ActionType as SharedActionType,
  AddressType as SharedAddressType,
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
  TokenStandard as SharedTokenStandard,
  type Action as SharedAction,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@dfinity/principal";
import type { AddAssetItem } from "../types/genericCreationLinkStore";

/**
 * Store for draft link state management
 */
export class LinkCreationStoreV3 {
  // Private state variables - declare with $state at class level
  #state = $state<LinkCreationStateV3>(new ChooseLinkTypeStateV3(this));

  #draftLink = $state<SharedLink>({
    id: "",
    title: "",
    link_type: SharedLinkType.SendTip,
    link_state: SharedLinkState.ChooseType,
    creator: Principal.anonymous(),
    asset_info: [],
    max_use: 1n,
    use_count: 0n,
  });

  #draftAction = $state<SharedAction | undefined>();
  #backendLink = $state<SharedLink | undefined>();
  #backendAction = $state<SharedAction | undefined>();
  #icrc112Requests = $state<Icrc112Requests | undefined>();
  #id = $state<string>();

  constructor(draftLink: SharedLink) {
    this.#id = draftLink.id;
    this.#state = this.getStateHandler(draftLink.link_state);

    this.#draftLink = draftLink;

    $effect(() => {
      // Access reactive state to track changes
      void this.#draftLink;
      void this.#state;

      // Sync on changes (async, no await needed in effect)
      this.syncDraftLinkToStorage();
    });
  }

  get state(): LinkCreationStateV3 {
    return this.#state;
  }

  set state(state: LinkCreationStateV3) {
    this.#state = state;
  }

  get id(): string | undefined {
    return this.#id;
  }

  set id(id: string) {
    this.#id = id;
  }

  get draftLink(): SharedLink {
    return this.#draftLink;
  }

  set draftLink(link: SharedLink) {
    this.#draftLink = link;
  }

  get draftAction(): SharedAction | undefined {
    return this.#draftAction;
  }

  set draftAction(action: SharedAction | undefined) {
    this.#draftAction = action;
  }

  get backendLink(): SharedLink | undefined {
    return this.#backendLink;
  }

  set backendLink(link: SharedLink | undefined) {
    this.#backendLink = link;
  }

  get backendAction(): SharedAction | undefined {
    return this.#backendAction;
  }

  set backendAction(action: SharedAction | undefined) {
    this.#backendAction = action;
  }

  get icrc112Requests(): Icrc112Requests | undefined {
    return this.#icrc112Requests;
  }

  set icrc112Requests(requests: Icrc112Requests | undefined) {
    this.#icrc112Requests = requests;
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
  private getStateHandler(state: SharedLinkState): LinkCreationStateV3 {
    let initialState: LinkCreationStateV3;

    switch (state) {
      case SharedLinkState.ChooseType:
        initialState = new ChooseLinkTypeStateV3(this);
        break;
      case SharedLinkState.AddAsset:
        initialState = new AddAssetStateV3(this);
        break;
      case SharedLinkState.Preview:
        initialState = new PreviewStateV3(this);
        break;
      case SharedLinkState.Created:
        initialState = new LinkCreatedStateV3();
        break;
      default:
        initialState = new ChooseLinkTypeStateV3(this);
    }

    return initialState;
  }

  /**
   * Update and persist the draft link in the local storage
   * @returns
   */
  syncDraftLinkToStorage(): void {
    if (this.#state.step === LinkStep.CREATED) {
      return;
    }

    let title = this.#draftLink?.title ?? "Draft Link";
    let linkType = this.#draftLink?.link_type ?? SharedLinkType.SendTip;
    let assetInfo = this.#draftLink?.asset_info ?? [];
    let maxUse = this.#draftLink?.max_use ?? 1n;

    let linkState: SharedLinkState;
    switch (this.#state.step) {
      case LinkStep.CHOOSE_TYPE:
        linkState = SharedLinkState.ChooseType;
        break;
      case LinkStep.ADD_ASSET:
        linkState = SharedLinkState.AddAsset;
        break;
      case LinkStep.PREVIEW:
        linkState = SharedLinkState.Preview;
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

    if (this.#id && authState.account) {
      draftLinkService.update({
        id: this.#id,
        updateData: {
          title,
          linkType,
          assetInfo,
          maxUse,
          state: linkState,
        },
        owner: authState.account.owner,
      });
    }
  }

  setAssets(assets: AddAssetItem[]) {
    const assetInfo = assets.map((asset) => {
      const tokenMetadataRes = walletStore.findTokenByAddress(asset.address);
      let networkFee = 0n;
      let tokenStandard: SharedTokenStandard = SharedTokenStandard.ICRC2;
      if (tokenMetadataRes.isOk()) {
        const tokenMetadata = tokenMetadataRes.unwrap();
        networkFee = tokenMetadata.fee;
        if (
          tokenMetadata.tokenStandards &&
          !tokenMetadata.tokenStandards.includes(TokenStandard.ICRC2)
        ) {
          tokenStandard = SharedTokenStandard.ICRC1;
        }
      }
      return {
        asset: {
          address: Principal.fromText(asset.address),
          network_fee: networkFee,
          token_standard: tokenStandard,
        },
        amount: asset.useAmount,
        label: asset.address,
      };
    });

    this.#draftLink = {
      ...this.#draftLink,
      asset_info: assetInfo,
    };
  }

  /**
   * Initialize Action from template (actions.json) for V3 create flow.
   * Used for TIP_SHARED_TEST: creates action with 2 placeholder intents.
   */
  initializeCreateActionFromTemplate(linkType: SharedLinkType): boolean {
    if (authState.account?.owner === undefined) {
      throw new Error(
        "User must be authenticated to initialize action from template",
      );
    }

    const creator = Principal.fromText(authState.account.owner);
    const loadedActionResult = createActionFromTemplate(
      linkType,
      SharedActionType.CreateLink,
      creator,
    );
    if (loadedActionResult.isErr()) {
      throw new Error("Failed to initialize action from template");
    }
    const loadedAction = loadedActionResult.unwrap();
    this.#draftAction = loadedAction;

    return true;
  }

  /**
   * Populate the asset intents with the asset info from the draft link
   * @returns
   */
  populateAssetIntent(): void {
    if (!this.#draftAction || this.#draftAction.intents.length === 0) {
      throw new Error("Asset intent not found in action intents");
    }

    const intents = this.#draftAction.intents.filter(
      (i) =>
        i.source_address_type === SharedAddressType.Creator &&
        i.dest_address_type === SharedAddressType.Link,
    );
    if (intents.length === 0) {
      throw new Error("Asset intent not found in action intents");
    }

    const assetInfo = this.#draftLink?.asset_info ?? [];
    if (assetInfo.length === 0) return;

    const action = this.#draftAction;
    const linkAddress = Principal.fromText(CASHIER_BACKEND_CANISTER_ID);

    for (let i = 0; i < intents.length && i < assetInfo.length; i++) {
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
    }
  }

  /**
   * Populate the fee intent with the fee information for link creation (10_000 ICP to fee treasury)
   * @returns
   */
  populateFeeIntent(): void {
    if (!this.#draftAction || this.#draftAction.intents.length < 2) {
      throw new Error("Fee intent not found in action intents");
    }

    const icpPrincipal = Principal.fromText(ICP_LEDGER_CANISTER_ID);

    const intent = this.#draftAction.intents.filter(
      (i) =>
        i.source_address_type === SharedAddressType.Creator &&
        i.dest_address_type === SharedAddressType.Treasury,
    )[0];
    if (!intent) {
      throw new Error("Fee intent not found in action intents");
    }

    intent.asset = {
      address: icpPrincipal,
      network_fee: ICP_LEDGER_FEE,
      token_standard: SharedTokenStandard.ICRC2,
    };
    intent.amount = LINK_CREATION_FEE;
    intent.source_address = this.#draftAction.creator;
    intent.source_address_type = this.#draftAction.creator_address_type;
    intent.dest_address = Principal.fromText(FEE_TREASURY_PRINCIPAL);
    intent.dest_address_type = SharedAddressType.Treasury;
  }
}
