import { authState } from "$modules/auth/state/auth.svelte";
import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import type { CreateActionResponseV3 } from "$modules/detailLink/types/dto/create_action_v3";
import type { ProcessActionResponseV3 } from "$modules/detailLink/types/dto/process_action_v3";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import { LinkUserState } from "$modules/links/types/link/linkUserState";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { userLinkRepository } from "$modules/useLink/repositories/userLinkRepository";
import type {
  UserActionCapableStateV3,
  UserLinkStateV3,
} from "$modules/useLink/state/useLinkStatesV3";
import { AddressLockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressLocked";
import { AddressUnlockedStateV3 } from "$modules/useLink/state/useLinkStatesV3/addressUnlocked";
import { CompletedStateV3 } from "$modules/useLink/state/useLinkStatesV3/completed";
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";
import { findUseActionTypeFromLinkType } from "$modules/useLink/utils/useActionTypeFromLinkType";
import { userLinkStateFromStepV3 } from "$modules/useLink/utils/userLinkStateFromStep";

/**
 * Store for user link state management
 */
export class UserLinkStoreV3 {
  #state = $state<UserLinkStateV3>(new LandingStateV3(this));
  public linkDetail: LinkDetailStoreV3;

  constructor({ id }: { id: string }) {
    this.linkDetail = new LinkDetailStoreV3({ id });

    // initialize from persisted per-user state if present
    $effect(() => {
      const owner = authState.account?.owner;
      if (!owner) return;
      const persisted = userLinkRepository.getOne(owner, id);
      if (!persisted) return;
      if (persisted.step) {
        this.#state = userLinkStateFromStepV3(persisted.step, this);
      }
    });

    // persist changes to the per-user store whenever link id, owner or step changes
    $effect(() => {
      void authState.account?.owner;
      void this.#state;

      this.syncUserLink();
    });

    // react to backend-driven user state changes (e.g., completed)
    $effect(() => {
      const s = this.linkDetail.query.data?.link_user_state;
      if (s === LinkUserState.COMPLETED) {
        this.#state = new CompletedStateV3();
      }
    });

    // gate guard: sync state with actual gate open/closed status from backend
    $effect(() => {
      const gates = this.linkDetail.gates;
      if (gates.length === 0) return;
      if (this.linkDetail.action) return;

      const allOpen = gates.every(
        (g) =>
          g.gate_user_status[0]?.status != null &&
          "Open" in g.gate_user_status[0].status,
      );

      const step = this.#state.step;

      // If gates are closed but state advanced past them, reset back to locked
      if (!allOpen && step === UserLinkStep.ADDRESS_UNLOCKED) {
        this.#state = new AddressLockedStateV3(this);
      }

      // If all gates are already open, skip locked/gate steps and go to unlocked
      if (
        allOpen &&
        (step === UserLinkStep.ADDRESS_LOCKED || step === UserLinkStep.GATE)
      ) {
        this.#state = new AddressUnlockedStateV3(this);
      }
    });
  }

  /**
   * Persist the current user+link state to the repository. Best-effort and
   * centralized so we can add debouncing or conditional logic later.
   */
  syncUserLink(): void {
    const owner = authState.account?.owner;
    const linkId = this.linkDetail.id;
    if (!owner || !linkId) return;

    try {
      userLinkRepository.upsert({
        owner,
        linkId,
        data: { linkId, step: this.step },
      });
    } catch (e) {
      console.warn("userLink sync failed", e);
    }
  }

  /**
   * Get the current state
   */
  get state(): UserLinkStateV3 {
    return this.#state;
  }

  /**
   * Set the current state
   */
  set state(s: UserLinkStateV3) {
    this.#state = s;
  }

  // `locked` has been removed from the user-facing store and persistence.

  /**
   * The current step in the link creation process
   */
  get step(): UserLinkStep {
    return this.#state.step;
  }

  /* Convenience accessors for injected LinkDetailStore */
  get link() {
    return this.linkDetail?.link;
  }

  get action() {
    return this.linkDetail?.action;
  }

  get isLoading() {
    return this.linkDetail?.query?.isLoading ?? false;
  }

  get query() {
    return this.linkDetail?.query;
  }

  refreshAsync(): Promise<void> {
    return this.linkDetail?.query?.refreshAsync() ?? Promise.resolve();
  }

  /**
   * Method to transition to the next state
   */
  async goNext(): Promise<void> {
    await this.#state.goNext();
  }

  /**
   * Method to transition to the previous state
   */
  async goBack(): Promise<void> {
    await this.#state.goBack();
  }

  /**
   * Method to transition directly to Landing state
   * Only allowed if no action exists
   */
  async goToLanding(): Promise<void> {
    await this.#state.goToLanding();
  }

  /**
   * Create an action
   * @param actionType The type of action to create
   * @returns The action created
   */
  async createAction(
    actionType: ActionTypeValue,
  ): Promise<CreateActionResponseV3> {
    if (!this.isActionCapable(this.#state)) {
      throw new Error(
        `Current state ${this.#state.step} does not support user actions`,
      );
    }
    return await this.#state.createAction(actionType);
  }

  /**
   * Process an action
   * @returns The result of processing the action
   */
  async processAction(): Promise<ProcessActionResponseV3> {
    if (!this.isActionCapable(this.#state)) {
      throw new Error(
        `Current state ${this.#state.step} does not support user actions`,
      );
    }

    return await this.#state.processAction();
  }

  /**
   * Check if the current state supports user actions
   * @returns True if the current state supports user actions, false otherwise
   */
  private isActionCapable(
    state: UserLinkStateV3,
  ): state is UserActionCapableStateV3 {
    return "createAction" in state && "processAction" in state;
  }

  /**
   * Find the appropriate action type to use based on the link type
   * @returns The action type to use or null if none applicable
   */
  findUseActionType(): ActionTypeValue | null {
    if (!this.link) return null;
    return findUseActionTypeFromLinkType(this.link.link_type);
  }
}
