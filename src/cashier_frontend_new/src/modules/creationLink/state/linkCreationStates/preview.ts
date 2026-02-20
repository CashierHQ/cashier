import { authState } from "$modules/auth/state/auth.svelte";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";
import { buildCreateLinkInputV3 } from "$modules/creationLink/utils/createLinkInputV3Builder";
import { actionStore } from "$modules/creationLink/state/actionStore.svelte";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { mapV3ActionToFrontend } from "$modules/links/utils/actionV3Mapper";
import { mapV3LinkToFrontend } from "$modules/links/utils/linkV3Mapper";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { ActionMapper } from "$modules/links/types/action/action";
import { LinkMapper } from "$modules/links/types/link/link";
import { LinkType } from "$modules/links/types/link/linkType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from "$modules/creationLink/state/linkCreationStates";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { AddAssetState } from "$modules/creationLink/state/linkCreationStates/addAsset";
import { LinkCreatedState } from "$modules/creationLink/state/linkCreationStates/created";
import { AddAssetTipLinkState } from "$modules/creationLink/state/linkCreationStates/tiplink/addAsset";
import { AddAssetAirdropState } from "$modules/creationLink/state/linkCreationStates/airdrop/addAsset";
import { AddAssetTokenBasketState } from "$modules/creationLink/state/linkCreationStates/tokenbasket/addAsset";
import { AddAssetTipSharedTestState } from "$modules/creationLink/state/linkCreationStates/tipSharedTest/addAsset";
import { Principal } from "@dfinity/principal";

// State when the user is previewing the link before creation
export class PreviewState implements LinkCreationState {
  readonly step = LinkStep.PREVIEW;
  #link: LinkCreationStore;

  constructor(link: LinkCreationStore) {
    this.#link = link;
  }

  // Create the link using the backend service and move to the created state
  async goNext(): Promise<void> {
    if (this.#link.createLinkData.linkType === LinkType.TIP_SHARED_TEST) {
      const action = actionStore.action;
      if (!action?.intents?.length) {
        throw new Error(
          "Action with intents is required for TIP_SHARED_TEST creation",
        );
      }
      const creatorPrincipal = authState.account?.owner
        ? Principal.fromText(authState.account.owner)
        : Principal.fromText("aaaaa-aa");
      actionStore.updateV3IntentsWithFees(
        action.intents,
        this.#link.createLinkData,
        walletStore.query.data ?? [],
        creatorPrincipal,
        action.creator_address_type,
      );

      const inputResult = buildCreateLinkInputV3(
        this.#link.createLinkData,
        actionStore.action,
      );
      if (inputResult.isErr()) {
        throw new Error(inputResult.error.message);
      }
      const result = await cashierBackendService.createLinkV3(
        inputResult.value,
      );
      if (result.isErr()) {
        throw new Error(`Link creation failed: ${result.error.message}`);
      }
      const res = result.value;
      if (this.#link.id)
        tempLinkRepository.delete(
          this.#link.id,
          authState.account?.owner ?? "anon",
        );
      this.#link.id = res.link.id;
      this.#link.state = new LinkCreatedState();
      this.#link.link = mapV3LinkToFrontend(res.link);
      this.#link.action = mapV3ActionToFrontend(
        res.action,
        res.icrc112_requests,
      );
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
