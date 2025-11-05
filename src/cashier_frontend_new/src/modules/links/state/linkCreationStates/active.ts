import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";

// State when the link has been successfully active
export class LinkActiveState implements LinkCreationState {
  readonly step = LinkStep.ACTIVE;

  constructor() {}

  async goNext(): Promise<void> {
    throw new Error(
      "Cannot go next on LinkCreationState use LinkDetailState instead",
    );
  }

  // No previous state from the created state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}
