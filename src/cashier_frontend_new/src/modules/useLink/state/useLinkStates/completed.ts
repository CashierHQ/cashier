import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkState } from ".";

export class CompletedState implements UserLinkState {
  readonly step = UserLinkStep.COMPLETED;

  async goNext(): Promise<void> {
    throw new Error("Completed is final state, cannot go next");
  }

  async goBack(): Promise<void> {
    throw new Error("Completed is final state, cannot go back");
  }
}
