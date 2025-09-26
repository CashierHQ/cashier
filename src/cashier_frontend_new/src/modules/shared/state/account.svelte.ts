// Account state management
let account = $state<{
  owner: string | null;
  subaccount: string | null;
} | null>(null);

// Exported account state with get/set
export const accountState = {
  get account() {
    return account;
  },
  set account(value: { owner: string | null; subaccount: string | null; } | null) {
    account = value;
  },
};
