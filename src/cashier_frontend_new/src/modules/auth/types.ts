import type { OpenIdProvider } from "@icp-sdk/auth/client";
import type { PNP, PnpState } from "@windoge98/plug-n-play";
import type { INTERNET_IDENTITY_AUTH_PROVIDER } from "$modules/auth/constants";

export type AuthProvider =
  | OpenIdProvider
  | typeof INTERNET_IDENTITY_AUTH_PROVIDER;

export type AuthLoginResult =
  | { status: "authenticated" }
  | { status: "cancelled" };

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
