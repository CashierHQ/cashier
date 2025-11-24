import type { IITransport } from "$modules/auth/signer/ii/IITransport";
import { authState } from "$modules/auth/state/auth.svelte";
import Icrc112Service from "$modules/icrc112/services/icrc112Service";
import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import type { Signer } from "@slide-computer/signer";

export class TransactionCartStore {
  #icrc112Service: Icrc112Service<IITransport> | null = null;
  #action: Action;
  #handleProcessAction: () => Promise<ProcessActionResult>;

  constructor(
    action: Action,
    handleProcessAction: () => Promise<ProcessActionResult>,
  ) {
    this.#action = action;
    this.#handleProcessAction = handleProcessAction;
  }

  /**
   * Initializes the ICRC-112 service with current signer.
   */
  initialize() {
    const signer = authState.getSigner() as Signer<IITransport> | null;
    if (signer) {
      this.#icrc112Service = new Icrc112Service(signer);
    }
  }

  /**
   * Process the action, including executing any ICRC-112 requests if present.
   * @returns Promise resolving to ProcessActionResult
   * @throws Error if user is not authenticated or ICRC-112 service is not initialized.
   */
  async processAction(): Promise<ProcessActionResult> {
    if (!authState.account?.owner) {
      throw new Error("User is not authenticated.");
    }

    if (!this.#icrc112Service) {
      throw new Error("ICRC-112 Service is not initialized.");
    }

    if (
      this.#action.icrc_112_requests &&
      this.#action.icrc_112_requests.length > 0
    ) {
      // If there are ICRC-112 requests, execute them using ICRC-112 service.
      // The execution result is ignored here; errors will be handled in processAction handler.
      // The idea is using the BE to validate the ICRC-112 execution result and process the action accordingly.
      await this.#icrc112Service.sendBatchRequest(
        this.#action.icrc_112_requests,
        authState.account.owner,
        CASHIER_BACKEND_CANISTER_ID,
      );
    }

    // Trigger processing action after ICRC-112 execution
    return await this.#handleProcessAction();
  }
}
