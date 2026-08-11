import type { OpenIdProvider } from "@icp-sdk/auth/client";
import type { PNP, PnpState } from "@windoge98/plug-n-play";
import {
  AUTH_BROADCAST_MESSAGE_ACTIVITY,
  AUTH_BROADCAST_MESSAGE_LOGIN,
  AUTH_BROADCAST_MESSAGE_LOGOUT,
  type INTERNET_IDENTITY_AUTH_PROVIDER,
} from "$modules/auth/constants";

export type AuthProvider =
  | OpenIdProvider
  | typeof INTERNET_IDENTITY_AUTH_PROVIDER;

export type AuthLoginResult =
  | { status: "authenticated" }
  | { status: "cancelled" };

export type ConnectWithInternetIdentity = (
  openIdProvider?: OpenIdProvider,
) => Promise<void>;

export type PnpConnectionResult = Awaited<ReturnType<PNP["connect"]>>;

export type PnpUserGestureInternals = {
  stateManager: {
    getCurrentState: () => PnpState;
    transitionTo: (
      state: PnpState,
      context?: { error: unknown },
    ) => Promise<void>;
  };
  connectionManager: {
    connect: (walletId: string) => Promise<PnpConnectionResult>;
  };
  errorManager: {
    handleError: (error: unknown) => void;
  };
};

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
  sessionId: string;
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
      sessionId: string;
      walletId: string;
      hardExpiresAtMs: number;
      idleExpiresAtMs: number;
    }
  | {
      type: typeof AUTH_BROADCAST_MESSAGE_LOGOUT;
      sessionId: string;
      reason: LogoutReason;
    }
  | {
      type: typeof AUTH_BROADCAST_MESSAGE_ACTIVITY;
      sessionId: string;
      idleExpiresAtMs: number;
    };
