import type { LinkDetailStore as LinkDetailStoreType } from "$modules/detailLink/state/linkDetailStore.svelte";
import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import { LinkUserState } from "$modules/links/types/link/linkUserState";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from "./userLinkStates";
import { CompletedState } from "./userLinkStates/completed";
import { LandingState } from "./userLinkStates/landing";

/**
 * Simple store for user-facing link flow.
 */
export class UserLinkStore {
  #state = $state<UserLinkState>(new LandingState(this));

  // when true: Landing -> AddressLocked -> Gate -> AddressUnlocked -> Completed
  // when false: Landing -> AddressUnlocked -> Completed
  public locked = $state<boolean>(false);

  public linkDetail: LinkDetailStoreType;

  constructor({ locked = false, id }: { locked?: boolean; id: string }) {
    this.locked = locked;
    this.linkDetail = new LinkDetailStore({ id });

    $effect(() => {
      const s = this.linkDetail.query.data?.link_user_state;
      if (s === LinkUserState.COMPLETED) {
        this.#state = new CompletedState(this);
      }
    });
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
   * @param actionType
   * @returns The action created
   */
  async createAction(actionType: ActionTypeValue): Promise<Action> {
    return await this.#state.createAction(actionType);
  }

  /**
   * Process an action
   * @param actionId
   * @returns The result of processing the action
   */
  async processAction(): Promise<ProcessActionResult> {
    return await this.#state.processAction();
  }
}

export default UserLinkStore;
