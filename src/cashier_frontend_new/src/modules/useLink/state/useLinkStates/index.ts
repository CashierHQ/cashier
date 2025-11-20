import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
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

  /**
   * Method to create an action
   * @param actionType The type of action to create
   * @returns The created action or an error
   */
  createAction(actionType: ActionTypeValue): Promise<Action>;

  /**
   * Method to process an action
   * @returns The result of processing the action or an error
   */
  processAction(): Promise<ProcessActionResult>;
}
