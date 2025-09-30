import {
  PUBLIC_AUTH_IC_INTERNET_IDENTITY_PROVIDER,
  PUBLIC_AUTH_FEATURE_FLAGS_LOCAL_IDENTITY_PROVIDER,
} from "$env/static/public";
import {
  CASHIER_BACKEND_CANISTER_ID,
  TOKEN_STORAGE_CANISTER_ID,
} from "$modules/shared/constants";

// timeout for identity, 1 hour in nano second
export const TIMEOUT_NANO_SEC = 60 * 60 * 1_000_000_000;

// The canister IDs that the identity can call
export const TARGETS = [CASHIER_BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID];

// The Internet Identity provider URL
export const IC_INTERNET_IDENTITY_PROVIDER =
  PUBLIC_AUTH_IC_INTERNET_IDENTITY_PROVIDER;

// Feature flags
export const FEATURE_FLAGS = {
  // Whether to use local Internet Identity
  LOCAL_IDENTITY_PROVIDER_ENABLED:
    PUBLIC_AUTH_FEATURE_FLAGS_LOCAL_IDENTITY_PROVIDER === "true",
};
