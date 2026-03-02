import type { CreateActionResponseV3 } from "$modules/detailLink/types/dto/create_action_v3";
import type { ProcessActionResponseV3 } from "$modules/detailLink/types/dto/process_action_v3";
import type { ActionTypeValue } from "$modules/links/types/action/actionType";
import type { UserLinkStep } from "$modules/links/types/userLinkStep";

/**
 * State pattern interface for managing the different steps in the link detail.
 */
export interface UserLinkStateV3 {
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
   * Method to transition directly to Landing state
   */
  goToLanding(): Promise<void>;
}

export interface UserActionCapableStateV3 extends UserLinkStateV3 {
  /**
   * Method to create an action
   * @param actionType The type of action to create
   * @returns The created action or an error
   */
  createAction(actionType: ActionTypeValue): Promise<CreateActionResponseV3>;

  /**
   * Method to process an action
   * @returns The result of processing the action or an error
   */
  processAction(): Promise<ProcessActionResponseV3>;
}
