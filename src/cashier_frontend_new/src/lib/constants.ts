import {
  PUBLIC_HOST_ICP,
  PUBLIC_ICPSWAP_INDEX_CANISTER_ID,
  PUBLIC_THE_ANSWER,
} from '$env/static/public';

// Demo: reading values from environment at build time
export const THE_ANSWER = PUBLIC_THE_ANSWER;
export const ICPSWAP_INDEX_CANISTER_ID = PUBLIC_ICPSWAP_INDEX_CANISTER_ID;
export const HOST_ICP = PUBLIC_HOST_ICP;
