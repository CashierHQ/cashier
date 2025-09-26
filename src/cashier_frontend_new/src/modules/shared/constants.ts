import {
  PUBLIC_FEATURE_FLAGS_ENABLE_LOCAL_IDENTITY_PROVIDER,
  PUBLIC_SHARED_HOST_ICP,
  PUBLIC_SHARED_THE_ANSWER,
} from "$env/static/public";

// Demo: reading values from environment at build time
export const THE_ANSWER = PUBLIC_SHARED_THE_ANSWER;
// The ICP host URL
export const HOST_ICP = PUBLIC_SHARED_HOST_ICP;
// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_LOCAL_IDENTITY_PROVIDER: PUBLIC_FEATURE_FLAGS_ENABLE_LOCAL_IDENTITY_PROVIDER === "true",
}
