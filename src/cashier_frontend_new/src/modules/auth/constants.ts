import { PUBLIC_BACKEND_CANISTER_ID, PUBLIC_TOKEN_STORAGE_CANISTER_ID, PUBLIC_IC_INTERNET_IDENTITY_PROVIDER } from "$env/static/public";

// timeout for identity, 1 hour in nano second
export const TIMEOUT_NANO_SEC = 60 * 60 * 1_000_000_000
// The canister IDs that the identity can call
export const TARGETS = [PUBLIC_BACKEND_CANISTER_ID, PUBLIC_TOKEN_STORAGE_CANISTER_ID];
// The Internet Identity provider URL
export const IC_INTERNET_IDENTITY_PROVIDER = PUBLIC_IC_INTERNET_IDENTITY_PROVIDER || "https://id.ai";