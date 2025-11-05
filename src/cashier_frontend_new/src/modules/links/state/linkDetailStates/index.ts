import type { ActionType } from "$modules/links/types/action/actionType";
import type { LinkDetailStep } from "./linkStep";

/**
 * State pattern interface for managing the different steps in the link detail.
 */
export interface LinkDetailState {
  // The current step in the link creation process
  readonly step: LinkDetailStep;
  /**
   * Method to create action in the current state
   * @param actionType The type of action to create
   */
  createAction(actionType: ActionType): Promise<void>;
  /**
   * Method to process action in the current state
   * @param actionId id of the action to process
   */
  processAction(actionId: string): Promise<void>;
}
