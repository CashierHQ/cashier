import type { UserLinkState } from "./userLinkStates";
import { LandingState } from "./userLinkStates/landing";
import { CompletedState } from "./userLinkStates/completed";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { LinkUserState } from "$modules/links/types/link/linkUserState";
import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
import type { LinkDetailStore as LinkDetailStoreType } from "$modules/detailLink/state/linkDetailStore.svelte";
import { authState } from "$modules/auth/state/auth.svelte";
import { userLinkRepository } from "../repositories/userLinkRepository";
import { userLinkStateFromStep } from "../utils/userLinkStateFromStep";

/**
 * Simple store for user-facing link flow.
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
        this.#state = new CompletedState(this);
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
}

export default UserLinkStore;
