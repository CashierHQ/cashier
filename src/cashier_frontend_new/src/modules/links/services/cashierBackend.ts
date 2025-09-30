
import type { Account } from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import { accountState } from "$modules/shared/state/auth.svelte";
import { Principal } from "@dfinity/principal";

/**
 * Service for interacting with the Cashier Backend canister.
 */
export class CanisterBackendService {


  /**
   * Get the authenticated ICP Ledger actor for the current user.
   * @returns Authenticated ICP Ledger actor
   * @throws Error if the user is not authenticated
   */
  #getActor(): icpLedger._SERVICE {
    if (authState.pnp && authState.pnp.isAuthenticated()) {
      return authState.pnp.getActor({
        canisterId: CASHIER_BACKEND_CANISTER_ID,
        idl: icpLedger.idlFactory,
      });
    } else {
      throw new Error("User is not authenticated");
    }
  }

}