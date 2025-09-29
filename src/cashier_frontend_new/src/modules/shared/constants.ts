import {
  PUBLIC_SHARED_HOST_ICP,
  PUBLIC_SHARED_THE_ANSWER,
} from "$env/static/public";

// Demo: reading values from environment at build time
export const THE_ANSWER = PUBLIC_SHARED_THE_ANSWER;
export const HOST_ICP = PUBLIC_SHARED_HOST_ICP;
