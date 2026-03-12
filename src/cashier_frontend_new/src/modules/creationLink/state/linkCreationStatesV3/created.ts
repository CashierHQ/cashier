import type { LinkCreationStateV3 } from "$modules/creationLink/state/linkCreationStatesV3";
import { LinkStep } from "$modules/links/types/linkStep";

// State when the link has been successfully created
export class LinkCreatedStateV3 implements LinkCreationStateV3 {
  readonly step = LinkStep.CREATED;

  async goNext(): Promise<void> {
    throw new Error("No next state from Created");
  }

  // No previous state from the created state
  async goBack(): Promise<void> {
    throw new Error("No previous state from Created");
  }
}
