import type { Account } from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { accountState } from "$modules/shared/state/auth.svelte";
import { Principal } from "@dfinity/principal";
import type { TokenMetadata } from "../types";
import { balanceToIcp } from "../utils/converter";

/**
 * Service for interacting with ICP Ledger canister for a specific token
 * This service facilitates querying account balances and token metadata.
 */
export class IcpLedgerService {
  #canisterId: string;
  #decimals: number;

  constructor(metadata: TokenMetadata) {
    this.#canisterId = metadata.address;
    this.#decimals = metadata.decimals;
  }

  /**
   * Get the authenticated ICP Ledger actor for the current user.
   * @returns Authenticated ICP Ledger actor
   * @throws Error if the user is not authenticated
   */
  #getActor(): icpLedger._SERVICE {
    if (authState.pnp && authState.pnp.isAuthenticated()) {
      return authState.pnp.getActor({
        canisterId: this.#canisterId,
        idl: icpLedger.idlFactory,
      });
    } else {
      throw new Error("User is not authenticated");
    }
  }

  /**
   * Get the ledger account for the current authenticated user.
   * @returns The ledger account for the current authenticated user.
   * @throws Error if the user is not authenticated or no account is available.
   */
  #getAccount(): Account {
    if (
      authState.pnp &&
      authState.pnp.isAuthenticated() &&
      accountState.account
    ) {
      return {
        owner: Principal.fromText(accountState.account.owner),
        subaccount: [],
      };
    } else {
      throw new Error("User is not authenticated");
    }
  }

  /**
   * Get the account balance for the current user.
   * @returns The balance of the current authenticated user's account in ICP.
   * @throws Error if the user is not authenticated or balance retrieval fails.
   */
  public async getBalance(): Promise<number> {
    try {
      let actor: icpLedger._SERVICE = this.#getActor();
      let account: Account = this.#getAccount();
      let balance: bigint = await actor.icrc1_balance_of(account);
      return balanceToIcp(balance, this.#decimals);
    } catch (error) {
      console.error("Error get balance:", error);
      throw error;
    }
  }
}
