import { TypedBroadcastChannel } from "$lib/broadcast";
import { assertUnreachable } from "$lib/rsMatch";
import {
  BUILD_TYPE,
  FEATURE_FLAGS,
  HOST_ICP,
  IC_INTERNET_IDENTITY_PROVIDER,
  II_SIGNER_WALLET_ID,
} from "$modules/shared/constants";
import { TIMEOUT_NANO_SEC, NANOS_IN_MILLIS } from "$modules/auth/constants";
import { IISignerAdapter } from "$modules/auth/signer/ii/IISignerAdapter";
import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import type { BaseSignerAdapter, CreatePnpArgs } from "@windoge98/plug-n-play";
import { createPNP, PNP, type ActorSubclass } from "@windoge98/plug-n-play";
import { PersistedState } from "runed";
import { DelegationIdentity } from "@dfinity/identity";
import { SessionManager } from "../services/sessionManager";
import { calculateDelegationExpirationMs } from "../utils/calculateDelegationExpirationMs";

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
const connectedWalletId = new PersistedState<{ id: string | null }>(
  "connectedWallet",
  { id: null },
);

// state to store last logged in timestamp for session expiration check
const lastLoggedInTimestamp = new PersistedState<{ timestamp: number | null }>(
  "lastLoggedInTimestamp",
  { timestamp: null },
);

// Session timeout in milliseconds (converted from nanoseconds)
const SESSION_TIMEOUT_MS = Number(BigInt(TIMEOUT_NANO_SEC) / NANOS_IN_MILLIS);

// state to indicate if we are reconnecting
let isConnecting = $state(false);

// state to indicate if the initialization is complete. This does not mean we are logged in.
let isReady = $state(false);

// Account state
let account = $state<{
  owner: string;
  subaccount: string | null;
} | null>(null);

let sessionManager: SessionManager | null = null;

/**
 * Check if the stored session has expired based on last logged in timestamp.
 * @returns true if session is expired or no timestamp exists
 */
const isSessionExpired = (): boolean => {
  const lastTimestamp = lastLoggedInTimestamp.current.timestamp;
  if (lastTimestamp === null) {
    return false;
  }
  return Date.now() - lastTimestamp >= SESSION_TIMEOUT_MS;
};

/**
 * Clear all persisted auth state
 */
const clearPersistedState = () => {
  connectedWalletId.current.id = null;
  lastLoggedInTimestamp.current.timestamp = null;
};

// Initialize PNP instance
const initPnp = async () => {
  if (pnp) {
    return;
  }
  pnp = createPNP(CONFIG);

  const walletId = connectedWalletId.current.id;

  // If session is expired, clear persisted state and do not reconnect
  if (isSessionExpired()) {
    clearPersistedState();
    isReady = true;
    return;
  } else if (walletId) {
    try {
      await authState.login(walletId);
    } catch (error) {
      console.error("Auto-reconnect failed:", error);
    }
  } else {
    // unknown state, clear persisted state
    clearPersistedState();
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
    await inner_login(walletId);

    // Store last logged in timestamp for session expiration check on next init
    lastLoggedInTimestamp.current.timestamp = Date.now();

    // Setup session manager
    await setupSessionManager(walletId);

    // broadcast login event to another tab
    broadcastChannel.post(BroadcastMessageLogin);
    // invoke configured login handler if exists
    if (loginHandler) {
      loginHandler();
    }
  },

  // Disconnect from wallet. Calls custom logout handler if set, otherwise redirects to /
  async logout() {
    await inner_logout();
    broadcastChannel.post("Logout");
    // invoke configured logout handler if exists, otherwise default to redirect to '/'
    if (logoutHandler) {
      logoutHandler();
    }
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
const broadcastChannel = new TypedBroadcastChannel<"Login" | "Logout">(
  "authService",
);
const BroadcastMessageLogin = "Login";
const BroadcastMessageLogout = "Logout";

broadcastChannel.onMessage((message) => {
  switch (message) {
    case BroadcastMessageLogin:
      console.log("Broadcast login received");
      if (connectedWalletId.current.id) {
        inner_login(connectedWalletId.current.id);
      }
      break;
    case BroadcastMessageLogout:
      console.log("Broadcast logout received");
      inner_logout();
      break;
    default:
      assertUnreachable(message);
  }
});
// ---------------------------------------------------------------------------
// Broadcast channel end
// ---------------------------------------------------------------------------

// Perform logout
const inner_logout = async () => {
  if (!pnp) {
    throw new Error("PNP is not initialized");
  }
  try {
    await pnp.disconnect();
    account = null;
    clearPersistedState();
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};

/**
 * Setup session manager with delegation expiration timeout.
 */
const setupSessionManager = async (walletId: string) => {
  if (walletId !== II_SIGNER_WALLET_ID) {
    throw new Error("Session manager is only supported for II signer");
  }

  if (!pnp) {
    throw new Error("PNP is not initialized");
  }

  const iiAdapter = pnp.provider as IISignerAdapter;
  // II always return DelegationIdentity after login
  const delegationIdentity = iiAdapter
    .getAuthClient()
    ?.getIdentity() as DelegationIdentity;

  const delegationExpirationInMillis = calculateDelegationExpirationMs(
    delegationIdentity.getDelegation(),
  );

  if (delegationExpirationInMillis <= 0) {
    await inner_logout();
    return;
  }
  sessionManager = new SessionManager({
    timeout: delegationExpirationInMillis,
  });
  sessionManager.registerCallback(async () => {
    await inner_logout();
  });
};

// Perform login
// only delegated identity
const inner_login = async (walletId: string) => {
  if (!pnp) {
    throw new Error("PNP is not initialized");
  }
  isConnecting = true;
  try {
    const res = await pnp.connect(walletId);

    console.log("Login successful:", res);

    if (res.owner === null) {
      throw new Error("Login failed: owner is null");
    }
    account = {
      owner: res.owner,
      subaccount: res.subaccount,
    };
    connectedWalletId.current.id = walletId;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  } finally {
    isConnecting = false;
  }
};

// Immediately initialize PNP instance on module load
initPnp();
