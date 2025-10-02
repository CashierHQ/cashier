import {
  BACKEND_CANISTER_ID,
  TOKEN_STORAGE_CANISTER_ID,
} from "$modules/shared/constants";

// timeout for identity, 1 hour in nano second
export const TIMEOUT_NANO_SEC = 60 * 60 * 1_000_000_000;

// The canister IDs that the identity can call
export const TARGETS = [BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID];

export const CONNECT_WALLET_ID_KEY = "connectedWalletId";
