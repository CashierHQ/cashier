import type { LinkStep } from "$modules/links/types/linkStep";

/**
 * State pattern interface for managing the different steps in the link creation process.
 */
export interface LinkState {
  // The current step in the link creation process
  readonly step: LinkStep;
  // Method to transition to the next state
  goNext(): Promise<void>;
  // Method to transition to the previous state
  goBack(): Promise<void>;
}
