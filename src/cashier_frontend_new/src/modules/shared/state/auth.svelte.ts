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
};
