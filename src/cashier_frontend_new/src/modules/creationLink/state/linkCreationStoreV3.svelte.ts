import { assertUnreachable } from "$lib/rsMatch";
import { actionTemplateLoader } from "$modules/actionTemplate/services/actionTemplateLoader";
import type { GateDraft } from "$modules/gating/types/gate";
import { authState } from "$modules/auth/state/auth.svelte";
import { draftLinkService } from "$modules/creationLink/services/draftLink";
import { draftGateRepository } from "$modules/creationLink/repositories/draftGateRepository";
import type { LinkCreationStateV3 } from "$modules/creationLink/state/linkCreationStatesV3";
import { AddAssetStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/addAsset";
import { ChooseLinkTypeStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/chooseLinkType";
import { LinkCreatedStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/created";
import { LockStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/lock";
import { PreviewStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/preview";
import { type Icrc112Requests } from "$modules/icrc112/types/icrc112Request";
import { LinkStep } from "$modules/links/types/linkStep";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { TokenStandard } from "$modules/token/types/tokenStandard";
import {
  ActionType as SharedActionType,
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
  TokenStandard as SharedTokenStandard,
  type Action as SharedAction,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { Err, Ok, Result } from "ts-results-es";
import type { AddAssetItem } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
import type { DraftLink } from "$modules/creationLink/types";

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
  #pendingGateDraft = $state<GateDraft | null>(null);

  constructor(draftLink: DraftLink) {
    this.#id = draftLink.id;
    this.#pendingGateDraft =
      authState.account && this.#id
        ? draftGateRepository.get(authState.account.owner, this.#id)
        : null;
    this.#draftLink = draftLink;
    this.#state = this.getStateHandler(draftLink);

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

  get pendingGateDraft(): GateDraft | null {
    return this.#pendingGateDraft;
  }

  set pendingGateDraft(draft: GateDraft | null) {
    this.#pendingGateDraft = draft;

    if (!this.#id || !authState.account) return;

    if (draft) {
      draftGateRepository.save(authState.account.owner, this.#id, draft);
    } else {
      draftGateRepository.delete(authState.account.owner, this.#id);
    }
  }

  get linkType(): SharedLinkType {
    return this.#draftLink.link_type;
  }

  /**
   * Delegates to the active create-flow state to move forward.
   *
   * @returns Promise that resolves when the active state transition completes.
   */
  async goNext(): Promise<void> {
    await this.#state.goNext();
  }

  /**
   * Delegates to the active create-flow state to move backward.
   *
   * @returns Promise that resolves when the active state transition completes.
   */
  async goBack(): Promise<void> {
    await this.#state.goBack();
  }

  /**
   * Derives the initial create-flow state from the persisted draft link.
   *
   * @param draftLink - Draft link to restore.
   * @returns Create-flow state matching the stored draft progress.
   */
  private getStateHandler(draftLink: DraftLink): LinkCreationStateV3 {
    let initialState: LinkCreationStateV3;

    switch (draftLink.link_state) {
      case SharedLinkState.ChooseType:
        initialState = new ChooseLinkTypeStateV3(this);
        break;
      case SharedLinkState.AddAsset:
        initialState = new AddAssetStateV3(this);
        break;
      case SharedLinkState.Preview:
        initialState =
          draftLink.creationStep === LinkStep.LOCK
            ? new LockStateV3(this)
            : new PreviewStateV3(this);
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
   * Updates and persists the draft link in local storage.
   *
   * @returns Nothing.
   */
  syncDraftLinkToStorage(): void {
    if (this.#state.step === LinkStep.CREATED) {
      return;
    }

    const title = this.#draftLink?.title ?? "Draft Link";
    const linkType = this.#draftLink?.link_type ?? SharedLinkType.SendTip;
    const assetInfo = this.#draftLink?.asset_info ?? [];
    const maxUse = this.#draftLink?.max_use ?? 1n;

    let linkState: SharedLinkState;
    switch (this.#state.step) {
      case LinkStep.CHOOSE_TYPE:
        linkState = SharedLinkState.ChooseType;
        break;
      case LinkStep.ADD_ASSET:
        linkState = SharedLinkState.AddAsset;
        break;
      case LinkStep.LOCK:
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
          creationStep: this.#state.step,
        },
        owner: authState.account.owner,
      });
    }
  }

  /**
   * Sets asset information in the draft link from the Add Asset step model.
   *
   * @param assets - Assets selected in the Add Asset step.
   * @returns Nothing.
   */
  setAssets(assets: AddAssetItem[]): void {
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
   * Initializes the create-link action from the current link template.
   *
   * @returns Result indicating whether the action was initialized.
   */
  initializeCreateLinkActionFromTemplate(): Result<boolean, Error> {
    if (authState.account?.owner === undefined) {
      return Err(
        new Error(
          "User must be authenticated to initialize action from template",
        ),
      );
    }

    const creator = Principal.fromText(authState.account.owner);
    const gateCount = this.#pendingGateDraft ? 1 : 0;
    const loadedActionResult = actionTemplateLoader.createActionFromTemplate(
      this.linkType,
      SharedActionType.CreateLink,
      creator,
      {
        assetInfo: this.#draftLink.asset_info,
        gateCount,
        maxUse: Number(this.#draftLink.max_use),
      },
    );
    if (loadedActionResult.isErr()) {
      return Err(new Error("Failed to load action from template"));
    }
    const loadedAction = loadedActionResult.unwrap();
    this.#draftAction = loadedAction;

    return Ok(true);
  }
}
