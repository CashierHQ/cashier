import {
  PUBLIC_SHARED_SESSION_TIMEOUT_NANO_SEC,
  PUBLIC_SHARED_SESSION_IDLE_TIMEOUT_MILLIS_SEC,
} from "$env/static/public";
import {
  CASHIER_BACKEND_CANISTER_ID,
  TOKEN_STORAGE_CANISTER_ID,
} from "$modules/shared/constants";

// timeout for identity, 1 hour in nano second
export const TIMEOUT_NANO_SEC = PUBLIC_SHARED_SESSION_TIMEOUT_NANO_SEC
  ? Number(PUBLIC_SHARED_SESSION_TIMEOUT_NANO_SEC)
  : 60 * 60 * 1_000_000_000;

export const IDLE_TIMEOUT_MILLIS_SECOND =
  PUBLIC_SHARED_SESSION_IDLE_TIMEOUT_MILLIS_SEC
    ? Number(PUBLIC_SHARED_SESSION_IDLE_TIMEOUT_MILLIS_SEC)
    : 15 * 60 * 1000;

export const IDLE_ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "wheel",
] as const;

export const ACTIVITY_NOTIFICATION_THROTTLE_MS = 1_000;

export const AUTH_BROADCAST_MESSAGE_LOGIN = "Login";
export const AUTH_BROADCAST_MESSAGE_LOGOUT = "Logout";
export const AUTH_BROADCAST_MESSAGE_ACTIVITY = "Activity";

// The canister IDs that the identity can call
export const TARGETS = [CASHIER_BACKEND_CANISTER_ID, TOKEN_STORAGE_CANISTER_ID];

export const NANOS_IN_MILLIS = BigInt(1000000);
