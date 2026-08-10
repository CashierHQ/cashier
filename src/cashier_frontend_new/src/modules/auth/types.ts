import {
  AUTH_BROADCAST_MESSAGE_ACTIVITY,
  AUTH_BROADCAST_MESSAGE_LOGIN,
  AUTH_BROADCAST_MESSAGE_LOGOUT,
} from "$modules/auth/constants";

export type IdleCallback = () => unknown;

export type ActivityCallback = (idleExpiresAtMs: number) => unknown;

export type IdleSessionManagerOptions = {
  idleTimeoutMs: number;
  initialExpiresAtMs: number;
  onIdle: IdleCallback;
  onActivity?: ActivityCallback;
};

export type SessionLifecycleOptions = {
  hardExpiresAtMs: number;
  idleExpiresAtMs: number;
  idleTimeoutMs: number;
  onHardExpiry: () => unknown;
  onIdleExpiry: () => unknown;
  onActivity?: ActivityCallback;
};

export type SessionLifecycleTimestamps = {
  hardExpiresAtMs: number;
  idleExpiresAtMs: number;
};

export type SessionLifecycleTimestampOverrides =
  Partial<SessionLifecycleTimestamps>;

export type LogoutReason = "manual" | "hard-expiry" | "idle-expiry";

export type AuthBroadcastMessage =
  | typeof AUTH_BROADCAST_MESSAGE_LOGIN
  | typeof AUTH_BROADCAST_MESSAGE_LOGOUT
  | {
      type: typeof AUTH_BROADCAST_MESSAGE_LOGIN;
      walletId: string;
      hardExpiresAtMs: number;
      idleExpiresAtMs: number;
    }
  | {
      type: typeof AUTH_BROADCAST_MESSAGE_LOGOUT;
      reason: LogoutReason;
    }
  | {
      type: typeof AUTH_BROADCAST_MESSAGE_ACTIVITY;
      idleExpiresAtMs: number;
    };
