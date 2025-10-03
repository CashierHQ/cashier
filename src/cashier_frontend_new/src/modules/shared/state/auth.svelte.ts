import { encodeAccountID } from "$modules/token/services/icpLedger";
import { Principal } from "@dfinity/principal";

// Account state management
let account = $state<{
  owner: string;
  subaccount: string | null;
} | null>(null);

// Exported account state with get/set
export const accountState = {
  // Return current account information, null if not logged in
  get account() {
    return account;
  },

  // Update account information, normally set after login/logout
  set account(value: { owner: string; subaccount: string | null } | null) {
    account = value;
  },

  // Get the ICP AccountID (legacy) for the current auth user
  icpAccountID(): string | null {
    if (!account) {
      return null;
    }

    try {
      const principal = Principal.fromText(account.owner);
      return encodeAccountID(principal);
    } catch (error) {
      console.error("Error encoding ICP accountID:", error);
      return null;
    }
  },
};
