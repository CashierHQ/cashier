import type { UserLinkState } from "./userLinkStates";
import { LandingState } from "./userLinkStates/landing";
import { UserLinkStep } from "$modules/links/types/userLinkStep";

/**
 * Simple store for user-facing link flow.
 */
export class UserLinkStore {
  #state: UserLinkState;
  // when true: Landing -> AddressLocked -> Gate -> AddressUnlocked -> Completed
  // when false: Landing -> AddressUnlocked -> Completed
  public locked: boolean;

  constructor({ locked = false }: { locked?: boolean } = {}) {
    this.locked = $state(locked);
    this.#state = $state(new LandingState(this));
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

  /**
   * Method to transition to the next state
   */
  async goNext(): Promise<void> {
    console.log("UserLinkStore.goNext called");
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
