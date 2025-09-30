import type { Account } from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { accountState } from "$modules/shared/state/auth.svelte";
import { Principal } from "@dfinity/principal";

export class IcpLedgerService {
  #canisterId: string;

  constructor(canisterId: string) {
    this.#canisterId = canisterId;
  }

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

  #getAccount(): Account {
    if (
      authState.pnp &&
      authState.pnp.isAuthenticated() &&
      accountState.account
    ) {
      console.log("Account state:", accountState.account);
      const encoder = new TextEncoder();
      return {
        owner: Principal.fromText(accountState.account.owner),
        subaccount: [],
      };
    } else {
      throw new Error("User is not authenticated");
    }
  }

  public async getBalance(): Promise<bigint> {
    try {
      let actor: icpLedger._SERVICE = this.#getActor();
      let account: Account = this.#getAccount();
      console.log("Account for balance:", account);
      let balance = await actor.icrc1_balance_of(account);
      console.log("Balance:", balance);
      return balance;
    } catch (error) {
      console.error("Error listing tokens:", error);
      throw error;
    }
  }
}
