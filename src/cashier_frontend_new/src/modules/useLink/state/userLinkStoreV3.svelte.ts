import { authState } from "$modules/auth/state/auth.svelte";
import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import type { CreateActionResponseV3 } from "$modules/detailLink/types/dto/create_action_v3";
import type { ProcessActionResponseV3 } from "$modules/detailLink/types/dto/process_action_v3";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { isLinkEnded } from "$modules/links/utils/linkEnded";
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
  #persistedStateRestoredOwner = $state<string | null>(null);
  public linkDetail: LinkDetailStoreV3;

  constructor({ id }: { id: string }) {
    this.linkDetail = new LinkDetailStoreV3({ id });
    this.#restorePersistedState(id);

    // initialize from persisted per-user state if present
    $effect(() => {
      this.#restorePersistedState(id);
    });

    // persist changes to the per-user store whenever link id, owner or step changes
    $effect(() => {
      void authState.account?.owner;
      void this.#state;
      void this.#persistedStateRestoredOwner;

      if (
        !authState.account?.owner ||
        this.#persistedStateRestoredOwner !== authState.account.owner
      ) {
        return;
      }

      this.syncUserLink();
    });

    // Reconcile state with backend-driven data: as long as the link isn't
    // ended, the user can always start a fresh claim (or resume a pending
    // one) even after previously completing one — multiple claims per user
    // are allowed while slots remain. Only once the link has ended, and there
    // is no pending action to resume, does the user land on Completed.
    // Unlike the old one-directional effect (which only ever pushed toward
    // Completed and could never reverse), this also moves a user back off a
    // stale/persisted Completed step once the backend confirms they can
    // claim again.
    $effect(() => {
      if (!this.linkDetail.query.data) return;

      const nextStep = resolveReconciledStep(
        !!this.linkDetail.action,
        isLinkEnded(this.link),
        this.#state.step,
      );

      if (nextStep === UserLinkStep.COMPLETED) {
        this.#state = new CompletedStateV3();
      } else if (nextStep === UserLinkStep.ADDRESS_UNLOCKED) {
        this.#state = new AddressUnlockedStateV3(this);
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

  #restorePersistedState(id: string): void {
    const owner = authState.account?.owner;
    if (!owner) {
      this.#persistedStateRestoredOwner = null;
      return;
    }

    const persisted = userLinkRepository.getOne(owner, id);
    if (persisted?.step !== undefined) {
      this.#state = userLinkStateFromStepV3(persisted.step, this);
    }
    this.#persistedStateRestoredOwner = owner;
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

  /**
   * Whether the public link route is waiting for its initial link payload.
   *
   * Background refreshes can happen after user actions are created or processed.
   * Once a link is already available, those refreshes should not make the route
   * guard replace the current screen with a full-page loading state.
   *
   * @returns `true` only while the link query is loading and no link is loaded.
   */
  get isLoading() {
    return (this.linkDetail?.query?.isLoading ?? false) && !this.link;
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
   * @param state The current state
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

/**
 * Pure decision logic for the state-reconciliation effect above, extracted so
 * it can be unit tested directly without needing a live Svelte effect root.
 * @param hasPendingAction Whether the link has a pending action to resume
 * @param linkEnded Whether the link has ended (no more claims possible)
 * @param currentStep The current step in the user link flow
 * @returns the step to transition to, or `null` if the current step should
 * be left alone.
 */
export function resolveReconciledStep(
  hasPendingAction: boolean,
  linkEnded: boolean,
  currentStep: UserLinkStep,
): UserLinkStep | null {
  if (linkEnded && !hasPendingAction) {
    return currentStep !== UserLinkStep.COMPLETED
      ? UserLinkStep.COMPLETED
      : null;
  }
  if (currentStep === UserLinkStep.COMPLETED) {
    return UserLinkStep.ADDRESS_UNLOCKED;
  }
  return null;
}
