import { authState } from "$modules/auth/state/auth.svelte";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";
import type { LinkCreationState } from "$modules/creationLink/state/linkCreationStates";
import { AddAssetState } from "$modules/creationLink/state/linkCreationStates/addAsset";
import { AddAssetAirdropState } from "$modules/creationLink/state/linkCreationStates/airdrop/addAsset";
import { LinkCreatedState } from "$modules/creationLink/state/linkCreationStates/created";
import { AddAssetTipLinkState } from "$modules/creationLink/state/linkCreationStates/tiplink/addAsset";
import { AddAssetTipSharedTestState } from "$modules/creationLink/state/linkCreationStates/tipSharedTest/addAsset";
import { AddAssetTokenBasketState } from "$modules/creationLink/state/linkCreationStates/tokenbasket/addAsset";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionMapper } from "$modules/links/types/action/action";
import { LinkMapper } from "$modules/links/types/link/link";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";

// State when the user is previewing the link before creation
export class PreviewState implements LinkCreationState {
  readonly step = LinkStep.PREVIEW;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  // Create the link using the backend service and move to the created state
  async goNext(): Promise<void> {
    console.log("Creating link with data:", this.#link.createLinkData);

    if (
      this.#link.createLinkData.linkType === LinkType.TIP_SHARED_TEST ||
      this.#link.createLinkData.linkType === LinkType.AIRDROP_SHARED_TEST ||
      this.#link.createLinkData.linkType === LinkType.TOKEN_BASKET_SHARED_TEST
    ) {
      if (!this.#link.action_shared) {
        throw new Error("Action must be initialized for link");
      }

      const result = await cashierBackendService.createLinkV3(
        this.#link.createLinkData,
        this.#link.action_shared,
      );
      if (result.isErr()) {
        throw new Error(`Link creation failed: ${result.error.message}`);
      }

      console.log("Link created successfully with V3 API:", result.value);

      const res = result.value;
      if (this.#link.id)
        tempLinkRepository.delete(
          this.#link.id,
          authState.account?.owner ?? "anon",
        );

      this.#link.id = res.link.id;
      this.#link.state = new LinkCreatedState();
      this.#link.link_shared = res.link;
      this.#link.action_shared = res.action;
    } else {
      const result = await cashierBackendService.createLinkV2(
        this.#link.createLinkData,
      );

      if (result.isErr()) {
        throw new Error(`Link creation failed: ${result.error.message}`);
      }

      if (this.#link.id)
        tempLinkRepository.delete(
          this.#link.id,
          authState.account?.owner ?? "anon",
        );

      this.#link.id = result.value.link.id;
      this.#link.state = new LinkCreatedState();
      this.#link.link = LinkMapper.fromBackendType(result.value.link);
      this.#link.action = ActionMapper.fromBackendType(result.value.action);
    }
  }

  // Go back to the add asset state
  async goBack(): Promise<void> {
    if (this.#link.createLinkData.linkType === LinkType.TIP) {
      this.#link.state = new AddAssetTipLinkState(this.#link);
    } else if (
      this.#link.createLinkData.linkType === LinkType.TIP_SHARED_TEST
    ) {
      this.#link.state = new AddAssetTipSharedTestState(this.#link);
    } else if (this.#link.createLinkData.linkType === LinkType.AIRDROP) {
      this.#link.state = new AddAssetAirdropState(this.#link);
    } else if (this.#link.createLinkData.linkType === LinkType.TOKEN_BASKET) {
      this.#link.state = new AddAssetTokenBasketState(this.#link);
    } else {
      this.#link.state = new AddAssetState(this.#link);
    }
  }
}
