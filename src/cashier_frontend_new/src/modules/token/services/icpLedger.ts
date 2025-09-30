import type { Account } from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { accountState } from "$modules/shared/state/auth.svelte";
import { Principal } from "@dfinity/principal";
import type { TokenMetadata } from "../types";
import { weiToEther } from "../utils/converter";

export class IcpLedgerService {
  #canisterId: string;
  #decimals: number = 8; // Default to 8 decimals if not set

  constructor(metadata: TokenMetadata) {
    this.#canisterId = metadata.address;
    this.#decimals = metadata.decimals;
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

  public async getBalance(): Promise<number> {
    try {
      let actor: icpLedger._SERVICE = this.#getActor();
      let account: Account = this.#getAccount();
      console.log("Account for balance:", account);
      let balance: bigint = await actor.icrc1_balance_of(account);
      console.log("Balance:", balance);
      return weiToEther(balance, this.#decimals);
    } catch (error) {
      console.error("Error listing tokens:", error);
      throw error;
    }
  }
}
