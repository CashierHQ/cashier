import {
  PUBLIC_TOKEN_CKBTC_CANISTER_ID,
  PUBLIC_TOKEN_ICPSWAP_API_BASE_URL,
  PUBLIC_TOKEN_ICP_INDEX_CANISTER_ID,
  PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID,
  PUBLIC_TOKEN_IC_EXPLORER_BASE_URL,
} from "$env/static/public";

// The IC Explorer base URL
export const IC_EXPLORER_BASE_URL = PUBLIC_TOKEN_IC_EXPLORER_BASE_URL;

// The ICPSwap REST API base URL
export const ICPSWAP_API_BASE_URL = PUBLIC_TOKEN_ICPSWAP_API_BASE_URL;

// The ICP Ledger canister id
// All canister IDs must be predefined in env
export const ICP_LEDGER_CANISTER_ID = PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID;
export const ICP_LEDGER_FEE = 10_000n;

// The ICP Index canister id (for transaction history)
export const ICP_INDEX_CANISTER_ID = PUBLIC_TOKEN_ICP_INDEX_CANISTER_ID;

// Transaction history constants
export const DEFAULT_TX_PAGE_SIZE = 10n;
export const TX_STALE_TIME_MS = 30000; // 30s stale time for auto-revalidate
export const TX_REFETCH_INTERVAL_MS = 30000; // 60s auto-refresh interval

// ckBTC Canister ID
export const CKBTC_CANISTER_ID = PUBLIC_TOKEN_CKBTC_CANISTER_ID;
