import { HttpAgent } from "@dfinity/agent";
import { HOST_ICP } from "../constants";
import { FEATURE_FLAGS } from "$modules/auth/constants";

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

  // Return an HttpAgent, always anonymous if not logged in
  get agent() {
    const agent = HttpAgent.createSync({
      host: HOST_ICP,
      shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
    });
    return agent;
  },

  // Update account information, normally set after login/logout
  set account(value: { owner: string; subaccount: string | null } | null) {
    account = value;
  },
};
