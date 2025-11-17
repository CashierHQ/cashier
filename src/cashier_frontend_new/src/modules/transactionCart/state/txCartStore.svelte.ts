import type { IITransport } from "$modules/auth/signer/ii/IITransport";
import { authState } from "$modules/auth/state/auth.svelte";
import Icrc112Service from "$modules/icrc112/services/icrc112Service";
import type { Icrc112Requests } from "$modules/icrc112/types/icrc112Request";
import type Action from "$modules/links/types/action/action";
import type { Link } from "$modules/links/types/link/link";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import type { Signer } from "@slide-computer/signer";
import { Err, Ok, type Result } from "ts-results-es";

export class TransactionCartStore {
  #icrc112Service: Icrc112Service<IITransport> | null = null;
  #link: Link;
  #action: Action;
  #onIcrc112Executed: Promise<void> | null = null;

  constructor(link: Link, action: Action) {
    this.#link = link;
    this.#action = action;
  }

  initialize() {
    const signer = authState.getSigner() as Signer<IITransport> | null;
    if (signer) {
      this.#icrc112Service = new Icrc112Service(signer);
    }
  }

  async executeICRC112Requests(
    requests: Icrc112Requests,
  ): Promise<Result<boolean, Error>> {
    if (!authState.account?.owner) {
      return Err(new Error("You are not authorized to confirm this action."));
    }

    if (!this.#icrc112Service) {
      return Err(new Error("ICRC-112 Service is not initialized."));
    }

    // Execute ICRC-112 batch only if there are requests.
    try {
      const batchResult = await this.#icrc112Service.sendBatchRequest(
        requests,
        authState.account.owner,
        CASHIER_BACKEND_CANISTER_ID,
      );

      if (!batchResult.isSuccess) {
        const err = batchResult.errors
          ? batchResult.errors.join(", ")
          : "Unknown error";
        return Err(new Error(`Batch request failed: ${err}`));
      }

      return Ok(true);
    } catch (err) {
      return Err(
        new Error(
          `Error sending ICRC-112 batch request: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }
}
