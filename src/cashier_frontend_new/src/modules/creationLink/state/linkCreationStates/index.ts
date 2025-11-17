import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { LinkStep } from "$modules/links/types/linkStep";

/**
 * State pattern interface for managing the different steps in the link creation process.
 */
export interface LinkCreationState {
  // The current step in the link creation process
  readonly step: LinkStep;
  // Method to transition to the next state
  goNext(): Promise<void>;
  // Method to transition to the previous state
  goBack(): Promise<void>;

  /**
   * Process a specific action identified by actionId.
   * @param actionId
   * @returns A promise that resolves to the result of processing the action.
   */
  processAction(actionId: string): Promise<ProcessActionResult>;
}
