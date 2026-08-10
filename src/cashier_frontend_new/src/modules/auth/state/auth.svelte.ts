import { TypedBroadcastChannel } from "$lib/broadcast";
import {
  AUTH_BROADCAST_MESSAGE_ACTIVITY,
  AUTH_BROADCAST_MESSAGE_LOGIN,
  AUTH_BROADCAST_MESSAGE_LOGOUT,
  IDLE_TIMEOUT_MILLIS_SECOND,
  TIMEOUT_NANO_SEC,
} from "$modules/auth/constants";
import { AuthSessionMessageGuard } from "$modules/auth/services/authSessionMessageGuard";
import { SessionLifecycleManager } from "$modules/auth/services/sessionLifecycleManager";
import { IISignerAdapter } from "$modules/auth/signer/ii/IISignerAdapter";
import type {
  AuthBroadcastMessage,
  LogoutReason,
  SessionLifecycleTimestampOverrides,
  SessionLifecycleTimestamps,
} from "$modules/auth/types";
import {
  BUILD_TYPE,
  FEATURE_FLAGS,
  HOST_ICP,
  IC_INTERNET_IDENTITY_PROVIDER,
  II_SIGNER_WALLET_ID,
} from "$modules/shared/constants";
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import type { IDL } from "@icp-sdk/core/candid";
import { DelegationIdentity } from "@icp-sdk/core/identity";
import { Principal } from "@icp-sdk/core/principal";
import type { BaseSignerAdapter, CreatePnpArgs } from "@windoge98/plug-n-play";
import {
  createPNP,
  type ActorSubclass,
  type PNP,
} from "@windoge98/plug-n-play";
import { PersistedState } from "runed";
import { calculateDelegationExpirationMs } from "$modules/auth/utils/calculateDelegationExpirationMs";
import { isSessionExpired } from "$modules/auth/utils/isSessionExpired";

// Config for PNP instance
const CONFIG: CreatePnpArgs = {
  // Network settings
  network: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED ? "local" : "ic",
  // If local dfx network, set replica port
  ports: {
    replica: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED ? 8000 : undefined,
  },
  // Fetch root key for local network
  security: {
    fetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
  },
  delegation: {
    timeout: BigInt(TIMEOUT_NANO_SEC),
  },
  // Supported wallet adapters
  adapters: {
    iiSigner: {
      id: II_SIGNER_WALLET_ID,
      enabled: true,
      adapter: IISignerAdapter,
      config: {
        // url to the provider
        iiProviderUrl: IC_INTERNET_IDENTITY_PROVIDER,
        hostUrl: HOST_ICP,
        shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
        // set derivationOrigin
        // if production: allow www.cashierapp.io have the same identity as cashierapp.io
        // if other: use current origin
        derivationOrigin:
          BUILD_TYPE === "production"
            ? "https://cashierapp.io"
            : typeof window !== "undefined"
              ? window.location.origin
              : undefined,
        // idle options
        idleOptions: {
          // Cashier coordinates inactivity across tabs itself. The SDK's idle
          // manager is per-tab and can otherwise log out an active session when
          // an unused background tab reaches its timeout.
          disableIdle: true,
        },
      },
    },
  },
};

// Plug-n-play global instance
let pnp: PNP | null = null;

// Optional logout handler configured by UI components. If set, invoked when `authState.logout` is called.
let logoutHandler: (() => void) | null = null;

// Optional login handler configured by UI components. If set, invoked when `authState.login` completes successfully.
let loginHandler: (() => void) | null = null;

// state to store connected wallet ID for reconnecting later
const walletConnect = new PersistedState<{
  sessionId: string | null;
  id: string | null;
  expiredAtMs: number | null;
  idleExpiresAtMs: number | null;
}>("connectedWallet", {
  sessionId: null,
  id: null,
  expiredAtMs: null,
  idleExpiresAtMs: null,
});

// state to indicate if we are reconnecting
let isConnecting = $state(false);

// state to indicate if the initialization is complete. This does not mean we are logged in.
let isReady = $state(false);

// Account state
let account = $state<{
  owner: string;
  subaccount: string | null;
} | null>(null);

const sessionLifecycleManager = new SessionLifecycleManager();
const sessionMessageGuard = new AuthSessionMessageGuard();
let logoutInFlight: Promise<void> | null = null;

/**
 * Clear persisted wallet connect state
 */
const resetLoginState = () => {
  walletConnect.current = {
    sessionId: null,
    id: null,
    expiredAtMs: null,
    idleExpiresAtMs: null,
  };
  sessionMessageGuard.clear();
  account = null;
};

// Initialize PNP instance
const initPnp = async () => {
  if (pnp) {
    return;
  }
  pnp = createPNP(CONFIG);

  const walletId = walletConnect.current.id;

  // If session is expired, clear persisted state and do not reconnect
  const hardExpiryPassed =
    walletConnect.current.expiredAtMs &&
    isSessionExpired(walletConnect.current.expiredAtMs);
  const idleExpiryPassed =
    walletConnect.current.idleExpiresAtMs &&
    isSessionExpired(walletConnect.current.idleExpiresAtMs);

  if (hardExpiryPassed || idleExpiryPassed) {
    try {
      await IISignerAdapter.clearStoredSession();
    } catch (error) {
      console.error("Failed to clear expired authentication session:", error);
    }
    resetLoginState();
    isReady = true;
    return;
  } else if (walletId) {
    // try to reconnect
    try {
      await inner_login(walletId);
      await setupSessionLifecycle(walletId, {
        sessionId: walletConnect.current.sessionId ?? undefined,
        hardExpiresAtMs: walletConnect.current.expiredAtMs ?? undefined,
        idleExpiresAtMs: walletConnect.current.idleExpiresAtMs ?? undefined,
      });
    } catch (error) {
      console.error("Auto-reconnect failed:", error);
    }
  } else {
    // unknown state, clear persisted state
    resetLoginState();
  }

  isReady = true;
};

// Exported auth state and actions
export const authState = {
  // Return true if the user is logged in
  get isLoggedIn() {
    return isReady && account !== null;
  },

  // Return current account information, null if not logged in
  get account() {
    return account;
  },

  get sessionExpiresAtMs() {
    if (typeof window === "undefined") {
      return null;
    }

    return walletConnect.current.expiredAtMs;
  },

  // Getter isConnecting
  get isConnecting() {
    return isConnecting;
  },

  /**
   * True if the auth initialization is complete. This does not mean we are logged in.
   */
  get isReady() {
    return isReady;
  },

  /**
   * Get the current signer instance from the connected wallet.
   * @throws Error if PNP is not initialized or no adapter is connected
   * @returns The Signer instance from the connected wallet
   */
  getSigner() {
    if (!pnp) {
      throw new Error("PNP is not initialized");
    }
    if (!pnp.adapter) {
      throw new Error("No adapter is initialized");
    }

    const provider = pnp.provider as BaseSignerAdapter;

    return provider.getSigner();
  },

  /**
   * Build an anonymous HttpAgent instance.
   * @param host Optional host URL for the IC replica
   * @returns An anonymous HttpAgent instance
   */
  buildAnonymousAgent(host: string = HOST_ICP): HttpAgent {
    const shouldFetchRootKey = host.includes("localhost");
    return HttpAgent.createSync({
      host,
      shouldFetchRootKey,
    });
  },

  /**
   * Build an actor for a given canister ID and IDL factory.
   * @param canisterId  Canister ID to connect to
   * @param idlFactory IDL factory for the canister
   * @param options Options to force anonymous actor
   * @returns
   *  An ActorSubclass instance or null if user is not logged in
   *  null if account is not available
   */
  buildActor<T>({
    canisterId,
    idlFactory,
    options,
  }: {
    canisterId: string | Principal;
    idlFactory: IDL.InterfaceFactory;
    options?: {
      anonymous?: boolean;
      host?: string;
    };
  }): ActorSubclass<T> | null {
    // return anonymous actor if no PNP, or option set to anonymous
    if (!pnp || options?.anonymous) {
      return Actor.createActor(idlFactory, {
        agent: this.buildAnonymousAgent(options?.host),
        canisterId: canisterId,
      });
    }

    if (!account) {
      return null;
    }

    if (canisterId instanceof Principal) {
      canisterId = canisterId.toText();
    }

    // pnp is initialized and user is logged in, return actor with current identity
    return pnp.getActor({
      canisterId,
      idl: idlFactory,
    });
  },

  // Connect to wallet. Calls custom login handler if set, otherwise redirects to /links
  async login(walletId: string) {
    if (!pnp) {
      throw new Error("PNP is not initialized");
    }
    await inner_login(walletId, { renew: account !== null });

    const session = await setupSessionLifecycle(walletId);

    // broadcast login event to another tab
    broadcastChannel.post({
      type: AUTH_BROADCAST_MESSAGE_LOGIN,
      walletId,
      ...session,
    });
    // invoke configured login handler if exists
    if (loginHandler) {
      loginHandler();
    }
  },

  // Disconnect from wallet. Calls custom logout handler if set, otherwise redirects to /
  async logout() {
    await logoutEverywhere("manual");
  },

  // Configure a custom login handler that will be invoked when `authState.login` completes successfully.
  setOnLogin(handler: () => void) {
    loginHandler = handler;
  },

  // Clear any configured login handler
  resetOnLoginHandler() {
    loginHandler = null;
  },

  // Configure a custom logout handler that will be invoked when `authState.logout` is called.
  setOnLogout(handler: () => void) {
    logoutHandler = handler;
  },

  // Clear any configured logout handler
  resetOnLogoutHandler() {
    logoutHandler = null;
  },
};

// ----------------------------------------------------------------------------
// Broadcast channel start - A channel to broadcast login/logout messages
// ---------------------------------------------------------------------------
const broadcastChannel = new TypedBroadcastChannel<AuthBroadcastMessage>(
  "authService",
);

broadcastChannel.onMessage((message) => {
  void handleAuthBroadcastMessage(message);
});
// ---------------------------------------------------------------------------
// Broadcast channel end
// ---------------------------------------------------------------------------

/**
 * Disconnects the local wallet and clears every local session timer and state
 * value.
 *
 * @returns A promise that resolves after local logout cleanup completes.
 * @throws If Plug-N-Play has not initialized or wallet disconnection fails.
 */
const inner_logout = async () => {
  if (!pnp) {
    throw new Error("PNP is not initialized");
  }
  sessionLifecycleManager.exit();
  try {
    await pnp.disconnect();
  } finally {
    resetLoginState();
  }
};

/**
 * Logs out this tab and, by default, broadcasts the logout to every Cashier
 * tab. Concurrent logout attempts share one in-flight operation.
 *
 * @param reason - User action or expiry condition that initiated logout.
 * @param shouldBroadcast - Whether to notify the other Cashier tabs. Received
 * broadcast messages pass `false` to avoid rebroadcast loops.
 * @returns A promise that resolves after logout and notification handling.
 * @throws If the local wallet cannot be disconnected.
 */
const logoutEverywhere = (
  reason: LogoutReason,
  shouldBroadcast = true,
): Promise<void> => {
  if (logoutInFlight) return logoutInFlight;

  const sessionId = sessionMessageGuard.currentSessionId;

  logoutInFlight = (async () => {
    try {
      await inner_logout();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    } finally {
      if (shouldBroadcast && sessionId) {
        broadcastChannel.post({
          type: AUTH_BROADCAST_MESSAGE_LOGOUT,
          sessionId,
          reason,
        });
      }
      logoutHandler?.();
    }
  })().finally(() => {
    logoutInFlight = null;
  });

  return logoutInFlight;
};

/**
 * Applies a login, logout, or activity message received from another Cashier
 * tab.
 *
 * @param message - Legacy or structured authentication synchronization
 * message received through the auth broadcast channel.
 * @returns A promise that resolves after the local tab has synchronized.
 */
const handleAuthBroadcastMessage = async (
  message: AuthBroadcastMessage,
): Promise<void> => {
  try {
    // Keep accepting the legacy string messages while tabs from an older
    // deployment may still be open.
    if (message === AUTH_BROADCAST_MESSAGE_LOGIN) {
      if (walletConnect.current.id) {
        await inner_login(walletConnect.current.id);
        await setupSessionLifecycle(walletConnect.current.id);
      }
      return;
    }
    if (message === AUTH_BROADCAST_MESSAGE_LOGOUT) {
      await logoutEverywhere("manual", false);
      return;
    }

    switch (message.type) {
      case AUTH_BROADCAST_MESSAGE_LOGIN:
        if (!sessionMessageGuard.shouldAcceptLogin(message)) return;
        sessionLifecycleManager.exit();
        await inner_login(message.walletId, { restoreFromStorage: true });
        await setupSessionLifecycle(message.walletId, message);
        return;
      case AUTH_BROADCAST_MESSAGE_LOGOUT:
        if (!sessionMessageGuard.isCurrent(message.sessionId)) return;
        await logoutEverywhere(message.reason, false);
        return;
      case AUTH_BROADCAST_MESSAGE_ACTIVITY:
        if (
          sessionMessageGuard.isCurrent(message.sessionId) &&
          message.idleExpiresAtMs > (walletConnect.current.idleExpiresAtMs ?? 0)
        ) {
          walletConnect.current = {
            ...walletConnect.current,
            idleExpiresAtMs: message.idleExpiresAtMs,
          };
          sessionLifecycleManager.syncActivity(message.idleExpiresAtMs);
        }
        return;
    }
  } catch (error) {
    console.error("Failed to synchronize authentication state:", error);
  }
};

/**
 * Installs a replacement hard-expiry and shared idle-expiry lifecycle for an
 * authenticated Internet Identity session.
 *
 * @param walletId - Connected wallet adapter identifier. Only the Internet
 * Identity signer is supported.
 * @param timestamps - Optional absolute deadlines restored from persistence or
 * received from another tab. Missing deadlines are derived from the current
 * delegation and idle configuration.
 * @returns The absolute hard- and idle-expiry timestamps applied to the
 * session.
 * @throws If the adapter is unsupported, authentication is unavailable, or a
 * supplied/restored session has already expired.
 */
const setupSessionLifecycle = async (
  walletId: string,
  timestamps: SessionLifecycleTimestampOverrides = {},
): Promise<SessionLifecycleTimestamps> => {
  if (walletId !== II_SIGNER_WALLET_ID) {
    throw new Error("Session manager is only supported for II signer");
  }

  if (!pnp) {
    throw new Error("PNP is not initialized");
  }

  const iiAdapter = pnp.provider as IISignerAdapter;
  // v5: getIdentity() is now async — must await before casting
  // II always return DelegationIdentity after login
  const identity = await iiAdapter.getAuthClient()?.getIdentity();
  const delegationIdentity = identity as DelegationIdentity;

  const now = Date.now();
  const sessionId = timestamps.sessionId ?? globalThis.crypto.randomUUID();
  const hardExpiresAtMs =
    timestamps.hardExpiresAtMs ??
    now + calculateDelegationExpirationMs(delegationIdentity.getDelegation());
  const idleExpiresAtMs =
    timestamps.idleExpiresAtMs ?? now + IDLE_TIMEOUT_MILLIS_SECOND;

  // Store absolute deadlines so reloads and new tabs inherit the same session.
  walletConnect.current = {
    sessionId,
    id: walletId,
    expiredAtMs: hardExpiresAtMs,
    idleExpiresAtMs,
  };
  if (hardExpiresAtMs <= now) {
    await logoutEverywhere("hard-expiry");
    throw new Error("Cannot start an expired authentication session");
  }
  if (idleExpiresAtMs <= now) {
    await logoutEverywhere("idle-expiry");
    throw new Error("Cannot restore an inactive authentication session");
  }

  sessionLifecycleManager.renew({
    hardExpiresAtMs,
    idleExpiresAtMs,
    idleTimeoutMs: IDLE_TIMEOUT_MILLIS_SECOND,
    onHardExpiry: () => {
      void logoutEverywhere("hard-expiry");
    },
    onIdleExpiry: () => {
      void logoutEverywhere("idle-expiry");
    },
    onActivity: (nextIdleExpiresAtMs) => {
      if (!sessionMessageGuard.isCurrent(sessionId)) return;

      walletConnect.current = {
        ...walletConnect.current,
        idleExpiresAtMs: nextIdleExpiresAtMs,
      };
      broadcastChannel.post({
        type: AUTH_BROADCAST_MESSAGE_ACTIVITY,
        sessionId,
        idleExpiresAtMs: nextIdleExpiresAtMs,
      });
    },
  });

  sessionMessageGuard.activate({
    sessionId,
    hardExpiresAtMs,
    idleExpiresAtMs,
  });

  return { sessionId, hardExpiresAtMs, idleExpiresAtMs };
};

/**
 * Connects, renews, or rehydrates the delegated identity for this tab.
 *
 * @param walletId - Wallet adapter identifier.
 * @param options - Whether to force a fresh provider delegation or rehydrate
 * the delegation written by another tab.
 * @returns A promise that resolves after the local account is updated.
 */
const inner_login = async (
  walletId: string,
  options: { renew?: boolean; restoreFromStorage?: boolean } = {},
): Promise<void> => {
  if (!pnp) {
    throw new Error("PNP is not initialized");
  }
  isConnecting = true;
  try {
    const iiAdapter =
      walletId === II_SIGNER_WALLET_ID && pnp.adapter
        ? (pnp.provider as IISignerAdapter)
        : null;
    const res =
      options.restoreFromStorage && iiAdapter
        ? await iiAdapter.restoreSessionFromStorage()
        : options.renew && iiAdapter
          ? await iiAdapter.renewSession()
          : await pnp.connect(walletId);

    if (!res || res.owner === null) {
      throw new Error("Login failed: owner is null");
    }
    account = {
      owner: res.owner,
      subaccount: res.subaccount,
    };
    walletConnect.current.id = walletId;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  } finally {
    isConnecting = false;
  }
};

// Immediately initialize PNP instance on module load
initPnp();
