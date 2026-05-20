import {
  PUBLIC_CASHIER_WALLET_ORIGIN,
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

// Fee treasury principal (receives link creation fees). Matches backend fee_treasury_account.
export const FEE_TREASURY_PRINCIPAL =
  "lx4gp-2tgox-deted-i72n3-az3f3-wjavu-kiems-ctavz-dgdxi-fhyqa-lae";

export const LINK_CREATION_FEE = 10_000n;

// Prefix for temporary links storage in localStorage
export const TEMP_LINKS_STORAGE_KEY_PREFIX = "tempLinks";

export const USD_DISPLAY_DECIMALS = 6;

export const II_SIGNER_WALLET_ID = "iiSigner";

/** PNP built-in adapter ID for OISY Wallet. */
export const OISY_WALLET_ID = "oisy";

/** PNP adapter ID for the Cashier Wallet (ICRC-29 iframe wallet). */
export const CASHIER_WALLET_ID = "cashier";

/** Origin URL of the Cashier Wallet app (set via PUBLIC_CASHIER_WALLET_ORIGIN env var). */
export const CASHIER_WALLET_ORIGIN =
  PUBLIC_CASHIER_WALLET_ORIGIN || "http://localhost:9090";

/** PNP adapter ID for the local NFID forked wallet. */
export const NFID_WALLET_ID = "nfid-local";

/** Origin URL of the local NFID forked wallet. */
//export const NFID_WALLET_ORIGIN = "http://localhost:9090";
export const NFID_WALLET_ORIGIN = "https://vx6ob-pyaaa-aaaar-qb7dq-cai.icp0.io";

/** PNP adapter ID for the production NFID wallet. */
export const REAL_NFID_WALLET_ID = "nfid-real";

/** Origin URL of the production NFID wallet. */
export const REAL_NFID_WALLET_ORIGIN = "https://nfid.one";

export const DRAFT_LINKS_STORAGE_KEY_PREFIX = "draftLinks";
