import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { UserLinkStateV3 } from "$modules/useLink/state/useLinkStatesV3";

export class CompletedStateV3 implements UserLinkStateV3 {
  readonly step = UserLinkStep.COMPLETED;

  async goNext(): Promise<void> {
    throw new Error("Completed is final state, cannot go next");
  }

  async goBack(): Promise<void> {
    throw new Error("Completed is final state, cannot go back");
  }

  async goToLanding(): Promise<void> {
    throw new Error("Completed is final state, cannot go to Landing");
  }
}
