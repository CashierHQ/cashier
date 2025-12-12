import { LinkStep } from "$modules/links/types/linkStep";
import type { LinkCreationState } from ".";

// State when the link has been successfully created
export class LinkCreatedState implements LinkCreationState {
  readonly step = LinkStep.CREATED;

  async goNext(): Promise<void> {
    throw new Error("No next state from Created");
  }

  // No previous state from the created state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}
