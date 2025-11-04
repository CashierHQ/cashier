import type { LinkDetailStep } from "./linkStep";

/**
 * State pattern interface for managing the different steps in the link detail.
 */
export interface LinkDetailState {
  // The current step in the link creation process
  readonly step: LinkDetailStep;
  // Method create action in the current state
  createAction(): Promise<void>;
  // Method to process action in the current state
  processAction(): Promise<void>;
}
