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
  // public observable step for Svelte reactivity
  public currentStep: UserLinkStep;

  constructor({ locked = false }: { locked?: boolean } = {}) {
    this.locked = $state(locked);
    this.#state = $state(new LandingState(this));
    this.currentStep = $state(this.#state.step);
  }

  get state(): UserLinkState {
    return this.#state;
  }

  set state(s: UserLinkState) {
    this.#state = s;
    // update public observable so Svelte $state proxy sees a change
    this.currentStep = this.#state.step;
  }

  get step(): UserLinkStep {
    return this.#state.step;
  }

  async goNext(): Promise<void> {
    console.log("UserLinkStore.goNext called");
    await this.#state.goNext();
    // ensure public observable is in sync (in case a state mutated internal fields directly)
    this.currentStep = this.#state.step;
  }

  async goBack(): Promise<void> {
    await this.#state.goBack();
    // sync public observable
    this.currentStep = this.#state.step;
  }
}

export default UserLinkStore;
