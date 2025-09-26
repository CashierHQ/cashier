import {
  PUBLIC_SHARED_BACKEND_CANISTER_ID,
  PUBLIC_SHARED_BUILD_TYPE,
  PUBLIC_SHARED_HOST_ICP,
  PUBLIC_SHARED_TOKEN_STORAGE_CANISTER_ID,
} from "$env/static/public";

type BuildType = "dev" | "local" | "staging" | "production";
export const BUILD_TYPE: BuildType = PUBLIC_SHARED_BUILD_TYPE as BuildType;

// The ICP host URL
export const HOST_ICP = PUBLIC_SHARED_HOST_ICP;

// The backend_canister ID
export const BACKEND_CANISTER_ID = PUBLIC_SHARED_BACKEND_CANISTER_ID;

// The token_storage canister ID
export const TOKEN_STORAGE_CANISTER_ID =
  PUBLIC_SHARED_TOKEN_STORAGE_CANISTER_ID;
