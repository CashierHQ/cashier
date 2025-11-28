import {
  PUBLIC_SHARED_BUILD_TYPE,
  PUBLIC_SHARED_CASHIER_BACKEND_CANISTER_ID,
  PUBLIC_SHARED_FEATURE_FLAGS_LOCAL_IDENTITY_PROVIDER,
  PUBLIC_SHARED_HOST_ICP,
  PUBLIC_SHARED_HOST_ICP_MAINNET,
  PUBLIC_SHARED_IC_INTERNET_IDENTITY_PROVIDER,
  PUBLIC_SHARED_TOKEN_STORAGE_CANISTER_ID,
} from "$env/static/public";

type BuildType = "dev" | "local" | "staging" | "production";
export const BUILD_TYPE: BuildType = PUBLIC_SHARED_BUILD_TYPE as BuildType;

// The ICP host URL
export const HOST_ICP = PUBLIC_SHARED_HOST_ICP;
export const HOST_ICP_MAINNET = PUBLIC_SHARED_HOST_ICP_MAINNET;

// The backend_canister ID
export const CASHIER_BACKEND_CANISTER_ID =
  PUBLIC_SHARED_CASHIER_BACKEND_CANISTER_ID;

// The token_storage canister ID
export const TOKEN_STORAGE_CANISTER_ID =
  PUBLIC_SHARED_TOKEN_STORAGE_CANISTER_ID;

// The Internet Identity provider URL
export const IC_INTERNET_IDENTITY_PROVIDER =
  PUBLIC_SHARED_IC_INTERNET_IDENTITY_PROVIDER;

// Feature flags
export const FEATURE_FLAGS = {
  // Whether to use local Internet Identity
  LOCAL_IDENTITY_PROVIDER_ENABLED:
    PUBLIC_SHARED_FEATURE_FLAGS_LOCAL_IDENTITY_PROVIDER === "true",
};

// Prefix for temporary links storage in localStorage
export const TEMP_LINKS_STORAGE_KEY_PREFIX = "tempLinks";

export const USD_DISPLAY_DECIMALS = 6;

export const II_SIGNER_WALLET_ID = "iiSigner";
