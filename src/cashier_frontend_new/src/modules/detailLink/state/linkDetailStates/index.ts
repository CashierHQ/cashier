import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import { LinkStep } from "$modules/links/types/linkStep";

/**
 * State pattern interface for managing the different steps in the link detail.
 */
export interface LinkDetailState {
  // The current step in the link creation process
  readonly step: LinkStep;

  /**
   * Method to create action in the current state
   * @param actionType The type of action to create
   * @returns The created action
   */

  createAction(actionType: ActionTypeValue): Promise<Action>;
  /**
   * Method to process action in the current state
   * @returns The result of processing the action
   */
  processAction(): Promise<ProcessActionResult>;
}
