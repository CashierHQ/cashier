import { authState } from "$modules/auth/state/auth.svelte";
import type { LinkDetailStore as LinkDetailStoreType } from "$modules/detailLink/state/linkDetailStore.svelte";
import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { type ActionTypeValue } from "$modules/links/types/action/actionType";
import { LinkUserState } from "$modules/links/types/link/linkUserState";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { userLinkRepository } from "../repositories/userLinkRepository";
import { findUseActionTypeFromLinkType } from "../utils/useActionTypeFromLinkType";
import { userLinkStateFromStep } from "../utils/userLinkStateFromStep";
import type { UserActionCapableState, UserLinkState } from "./useLinkStates";
import { CompletedState } from "./useLinkStates/completed";
import { LandingState } from "./useLinkStates/landing";

/**
 * Store for user link state management
 */
export class UserLinkStore {
  #state = $state<UserLinkState>(new LandingState(this));
  public linkDetail: LinkDetailStoreType;

  constructor({ id }: { id: string }) {
    this.linkDetail = new LinkDetailStore({ id });

    // initialize from persisted per-user state if present
    $effect(() => {
      const owner = authState.account?.owner;
      if (!owner) return;
      const persisted = userLinkRepository.getOne(owner, id);
      if (!persisted) return;
      if (persisted.step) {
        this.#state = userLinkStateFromStep(persisted.step, this);
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
        this.#state = new CompletedState();
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
  get state(): UserLinkState {
    return this.#state;
  }

  /**
   * Set the current state
   */
  set state(s: UserLinkState) {
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
   * Create an action
   * @param actionType The type of action to create
   * @returns The action created
   */
  async createAction(actionType: ActionTypeValue): Promise<Action> {
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
  async processAction(): Promise<ProcessActionResult> {
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
    state: UserLinkState,
  ): state is UserActionCapableState {
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

export default UserLinkStore;
