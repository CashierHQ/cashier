import type {
  CreateActionResultV3,
  ProcessActionResultV3,
} from "$modules/detailLink/types/v3/action";
import { LinkStep } from "$modules/links/types/linkStep";
import type { Action as SharedAction } from "$shared";

/**
 * State pattern interface for managing the different steps in the link detail.
 */
export interface LinkDetailStateV3 {
  // The current step in the link creation process
  readonly step: LinkStep;

  /**
   * Method to create action in the current state
   * @param actionType The type of action to create
   * @returns The created action
   */

  createAction(action: SharedAction): Promise<CreateActionResultV3>;
  /**
   * Method to process action in the current state
   * @returns The result of processing the action
   */
  processAction(): Promise<ProcessActionResultV3>;
}
