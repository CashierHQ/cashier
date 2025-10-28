import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { ActionType } from "$modules/links/types/action/actionType";
import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkState } from ".";
import type { LinkStore } from "../linkStore.svelte";
import { LinkEndedState } from "./ended";

// State when the link has been successfully inactive
export class LinkInactiveState implements LinkState {
  readonly step = LinkStep.INACTIVE;
  #link: LinkStore;

  constructor(link: LinkStore) {
    this.#link = link;
  }

  async goNext(): Promise<void> {
    if (!this.#link.id) {
      throw new Error("Link ID is missing");
    }
    if (!this.#link.action || !this.#link.action.id) {
      throw new Error("Action ID is missing");
    }

    if (this.#link.action.type !== ActionType.Withdraw) {
      throw new Error("Cannot activate link with Withdraw action");
    }

    const result = await cashierBackendService.processActionV2(
      this.#link.action.id,
    );

    if (result.isErr()) {
      throw new Error(`Failed to inactive link: ${result.error}`);
    }

    this.#link.state = new LinkEndedState(this.#link);
  }

  // No previous state from the Inactive state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Inactive");
  }
}
