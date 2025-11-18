import type { UserLinkStep } from "$modules/links/types/userLinkStep";

/**
 * State pattern interface for managing the different steps in the link detail.
 */
export interface UserLinkState {
  // The current step in the link creation process
  readonly step: UserLinkStep;
  /**
   * Method to transition to the next state
   */
  goNext(): Promise<void>;
  /**
   * Method to transition to the previous state
   */
  goBack(): Promise<void>;
}
