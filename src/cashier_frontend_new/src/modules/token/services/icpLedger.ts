import type { Account } from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { Principal } from "@dfinity/principal";

/**
 * Service for interacting with ICP Ledger canister for a specific token
 * This service facilitates querying account balances and token metadata.
 */
export class IcpLedgerService {
  #canisterId: Principal;

  constructor(canisterId: Principal) {
    this.#canisterId = canisterId;
  }

  /**
   * Get the authenticated ICP Ledger actor for the current user.
   * @returns Authenticated ICP Ledger actor
   * @throws Error if the user is not authenticated
   */
  #getActor(): icpLedger._SERVICE | null {
    return authState.buildActor({
      canisterId: this.#canisterId,
      idlFactory: icpLedger.idlFactory,
    });
  }

  /**
   * Get the ledger account for the current authenticated user.
   * @returns The ledger account for the current authenticated user.
   * @throws Error if the user is not authenticated or no account is available.
   */
  #getAccount(): Account {
    if (
      authState.account
    ) {
      return {
        owner: Principal.fromText(authState.account.owner),
        subaccount: [],
      };
    } else {
      throw new Error("User is not authenticated");
    }
  }

  /**
   * Get the account balance for the current user.
   * @returns The balance of the current account.
   * @throws Error if the user is not authenticated or balance retrieval fails.
   */
  public async getBalance(): Promise<bigint> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const account: Account = this.#getAccount();
    return await actor.icrc1_balance_of(account);
  }
}
