import {
  PUBLIC_TOKEN_ICPSWAP_INDEX_CANISTER_ID,
  PUBLIC_TOKEN_ICP_INDEX_CANISTER_ID,
  PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID,
  PUBLIC_TOKEN_IC_EXPLORER_BASE_URL,
  PUBLIC_TOKEN_KONGSWAP_INDEX_CANISTER_ID,
} from "$env/static/public";

// The ICPSwap index canister id
export const ICPSWAP_INDEX_CANISTER_ID = PUBLIC_TOKEN_ICPSWAP_INDEX_CANISTER_ID;

// The KongSwap index canister id
export const KONGSWAP_INDEX_CANISTER_ID =
  PUBLIC_TOKEN_KONGSWAP_INDEX_CANISTER_ID;

// The IC Explorer base URL
export const IC_EXPLORER_BASE_URL = PUBLIC_TOKEN_IC_EXPLORER_BASE_URL;

// The ICP Ledger canister id
export const ICP_LEDGER_CANISTER_ID =
  PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID || "ryjl3-tyaaa-aaaaa-aaaba-cai";
export const ICP_LEDGER_FEE = 10_000n;

// The ICP Index canister id (for transaction history)
export const ICP_INDEX_CANISTER_ID =
  PUBLIC_TOKEN_ICP_INDEX_CANISTER_ID || "qhbym-qaaaa-aaaaa-aaafq-cai";

// Address type
export const PRINCIPAL_TYPE = 0;
export const ACCOUNT_ID_TYPE = 1;
