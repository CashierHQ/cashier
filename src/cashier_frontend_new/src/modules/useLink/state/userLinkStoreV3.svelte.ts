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
import { LandingStateV3 } from "$modules/useLink/state/useLinkStatesV3/landing";
import { findUseActionTypeFromLinkType } from "$modules/useLink/utils/useActionTypeFromLinkType";
import { userLinkStateFromStepV3 } from "$modules/useLink/utils/userLinkStateFromStep";

/**
 * Store for user link state management
 */
export class UserLinkStoreV3 {
  #state = $state<UserLinkStateV3>(new LandingStateV3(this));
  #persistedStateRestoredOwner = $state<string | null>(null);
  #hasReconciledStaleCompletedStep = false;
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

    $effect.pre(() => {
      if (this.linkDetail.query.isLoading) return;
      if (this.#hasReconciledStaleCompletedStep) return;
      this.#hasReconciledStaleCompletedStep = true;

      if (!this.linkDetail.query.data) return;

      const nextStep = resolveStaleCompletedStep(
        !!this.linkDetail.action,
        isLinkEnded(this.link),
        this.#state.step,
      );

      if (nextStep === UserLinkStep.LANDING) {
        this.#state = new LandingStateV3(this);
      } else if (nextStep === UserLinkStep.ADDRESS_UNLOCKED) {
        this.#state = new AddressUnlockedStateV3(this);
      }
    });

    // gate guard: demote back to locked if a gate that was open re-locks
    // (e.g. a timed unlock expiring) while the user is sitting on the
    // unlocked step. This only ever moves the user backward to match
    // reality; advancing past the locked/gate steps is only ever done via
    // an explicit goNext() (the user clicking Continue) - see
    // GateStateV3.goNext()/goBack() - never automatically by this effect,
    // otherwise reloading the page while on the Gate step right after
    // unlocking would silently skip straight to unlocked.
    $effect(() => {
      const gates = this.linkDetail.gates;
      if (gates.length === 0) return;
      if (this.linkDetail.action) return;

      const allOpen = gates.every(
        (g) =>
          g.gate_user_status[0]?.status != null &&
          "Open" in g.gate_user_status[0].status,
      );

      const nextStep = resolveGateGuardStep(allOpen, this.#state.step);

      if (nextStep === UserLinkStep.ADDRESS_LOCKED) {
        this.#state = new AddressLockedStateV3(this);
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

  /**
   * Whether the current use-link state allows navigating to the previous step.
   *
   * The user flow should not move backward once an action exists because the
   * action drawer is responsible for resuming or completing that pending work.
   *
   * @returns `true` when the current state can go back and no action exists.
   */
  get canGoBack(): boolean {
    if (this.action) return false;

    return (
      this.step === UserLinkStep.ADDRESS_LOCKED ||
      this.step === UserLinkStep.GATE ||
      this.step === UserLinkStep.ADDRESS_UNLOCKED
    );
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
 * Resolve a stale persisted Completed step to the correct next step, if any.
 * This is used to correct a persisted Completed step that is no longer valid
 * due to changes in the link state (e.g. a pending action exists or the link
 * has not ended).
 * @param hasPendingAction Whether the link has a pending action to resume
 * @param linkEnded Whether the link has ended (no more claims possible)
 * @param currentStep The current step in the user link flow
 * @returns the step to transition to, or `null` if the current step should
 * be left alone.
 */
export function resolveStaleCompletedStep(
  hasPendingAction: boolean,
  linkEnded: boolean,
  currentStep: UserLinkStep,
): UserLinkStep | null {
  if (currentStep !== UserLinkStep.COMPLETED) {
    return null;
  }
  if (hasPendingAction) {
    return UserLinkStep.ADDRESS_UNLOCKED;
  }
  if (!linkEnded) {
    return UserLinkStep.LANDING;
  }
  return null;
}

/**
 * Resolve the gate guard's reaction to the caller's current gate-open status.
 * This only ever demotes: if a gate that was open has re-locked (e.g. a timed
 * unlock expiring) while the user is on the unlocked step, send them back to
 * locked. It must never promote - advancing past the locked/gate steps is
 * only ever done via an explicit goNext() (the user clicking Continue), not
 * automatically here. Otherwise reloading the page while on the Gate step
 * right after unlocking would silently skip straight to unlocked.
 * @param allGatesOpen Whether every gate on the link currently reports Open
 * @param currentStep The current step in the user link flow
 * @returns the step to transition to, or `null` if the current step should
 * be left alone.
 */
export function resolveGateGuardStep(
  allGatesOpen: boolean,
  currentStep: UserLinkStep,
): UserLinkStep | null {
  if (!allGatesOpen && currentStep === UserLinkStep.ADDRESS_UNLOCKED) {
    return UserLinkStep.ADDRESS_LOCKED;
  }
  return null;
}
