import { authState } from "$modules/auth/state/auth.svelte";
import { draftLinkRepository } from "$modules/creationLink/repositories/draftLinkRepository";
import { draftGateRepository } from "$modules/creationLink/repositories/draftGateRepository";
import type { LinkCreationStateV3 } from "$modules/creationLink/state/linkCreationStatesV3";
import { LinkCreatedStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/created";
import { LockStateV3 } from "$modules/creationLink/state/linkCreationStatesV3/lock";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import type { GateKey } from "$lib/generated/cashier_backend/cashier_backend.did";
import { GateType, type GateDraft } from "$modules/gating/types/gate";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { LinkStep } from "$modules/links/types/linkStep";

/**
 * State handler for the Preview step in the V3 create-link flow.
 */
export function gateDraftToGateKey(gateDraft: GateDraft): GateKey {
  switch (gateDraft.type) {
    case GateType.PASSWORD:
      return { Password: gateDraft.password };
    case GateType.X_FOLLOWING:
      return { XFollowing: gateDraft.targetHandle };
    case GateType.X_OWNED_ACCOUNT:
      return { XOwnedAccount: gateDraft.targetHandle };
    case GateType.X_LIKED_POST:
      return { XLikedPost: gateDraft.tweetUrl };
    case GateType.X_RETWEETED_POST:
      return { XRetweetedPost: gateDraft.tweetUrl };
    case GateType.OTP_EMAIL:
      return { OTPEmail: gateDraft.email };
    case GateType.OTP_SMS:
      return { OTPSms: gateDraft.phone };
  }
}

// State handler for Preview step in the link creation flow (V3)
export class PreviewStateV3 implements LinkCreationStateV3 {
  readonly step = LinkStep.PREVIEW;
  #linkStore: LinkCreationStoreV3;

  constructor(linkStore: LinkCreationStoreV3) {
    this.#linkStore = linkStore;
    this.#linkStore.initializeCreateLinkActionFromTemplate();
  }

  /**
   * Creates the link through the backend service and moves to the created state.
   *
   * @returns Promise that resolves when the link is created.
   * @throws Error when the draft link, action initialization, or backend create call fails.
   */
  async goNext(): Promise<void> {
    if (!this.#linkStore.draftLink) {
      throw new Error("Link must be initialized to create");
    }

    const initializeActionResult =
      this.#linkStore.initializeCreateLinkActionFromTemplate();

    if (initializeActionResult.isErr()) {
      throw new Error(
        `Failed to initialize action from template: ${initializeActionResult.error.message}`,
      );
    }

    if (!this.#linkStore.draftAction) {
      throw new Error("Action must be initialized to create link");
    }

    // call backend API to create the link (with gates if configured)
    const gateKeys: GateKey[] =
      this.#linkStore.pendingGateDrafts.map(gateDraftToGateKey);

    const result = await cashierBackendService.createLinkV3(
      this.#linkStore.draftLink,
      this.#linkStore.draftAction,
      gateKeys,
    );

    if (result.isErr()) {
      throw new Error(`Link creation failed: ${result.error.message}`);
    }

    const createLinkResponse = result.unwrap();

    // delete draft link from local storage
    if (this.#linkStore.id) {
      const owner = authState.account?.owner ?? "anon";
      draftLinkRepository.delete(this.#linkStore.id, owner);
      draftGateRepository.delete(owner, this.#linkStore.id);
    }

    this.#linkStore.id = createLinkResponse.link.id;
    this.#linkStore.state = new LinkCreatedStateV3();
    this.#linkStore.backendLink = createLinkResponse.link;
    this.#linkStore.backendAction = createLinkResponse.action;
  }

  /**
   * Moves from preview back to the lock step.
   *
   * @returns Promise that resolves when the state is updated.
   */
  async goBack(): Promise<void> {
    this.#linkStore.state = new LockStateV3(this.#linkStore);
  }
}
