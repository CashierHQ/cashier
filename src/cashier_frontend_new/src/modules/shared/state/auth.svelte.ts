import { AccountIdentifier } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";

// TODO: add Buffer polyfill to support AccountIdentifier in browser
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

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

  // Get the Ledger Account for the current auth user
  getLedgerAccount(): string | null {
    if (!account) {
      return null;
    }

    try {
      const principal = Principal.fromText(account.owner);
      const identifier = AccountIdentifier.fromPrincipal({ principal });
      return identifier.toHex();
    } catch (error) {
      console.error("Error generating ledger account:", error);
      return null;
    }
  },
};
