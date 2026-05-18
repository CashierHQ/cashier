import { TypedBroadcastChannel } from "$lib/broadcast";
import { assertUnreachable } from "$lib/rsMatch";
import {
  IDLE_TIMEOUT_MILLIS_SECOND,
  TIMEOUT_NANO_SEC,
} from "$modules/auth/constants";
import { IISignerAdapter } from "$modules/auth/signer/ii/IISignerAdapter";
import { NFIDSignerAdapter } from "$modules/auth/signer/nfid/NFIDSignerAdapter";
import {
  BUILD_TYPE,
  CASHIER_WALLET_ID,
  CASHIER_WALLET_ORIGIN,
  FEATURE_FLAGS,
  HOST_ICP,
  IC_INTERNET_IDENTITY_PROVIDER,
  II_SIGNER_WALLET_ID,
  NFID_WALLET_ID,
  NFID_WALLET_ORIGIN,
  REAL_NFID_WALLET_ID,
  REAL_NFID_WALLET_ORIGIN,
} from "$modules/shared/constants";
import { TARGETS } from "$modules/auth/constants";
import { CashierWalletSignerAdapter } from "@cashier-wallet/wallet-sdk";
import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { DelegationIdentity } from "@dfinity/identity";
import { Principal } from "@dfinity/principal";
import type { BaseSignerAdapter, CreatePnpArgs } from "@windoge98/plug-n-play";
import { createPNP, PNP, type ActorSubclass } from "@windoge98/plug-n-play";
import { PersistedState } from "runed";
import { SessionManager } from "../services/sessionManager";
import { calculateDelegationExpirationMs } from "../utils/calculateDelegationExpirationMs";
import { isSessionExpired } from "../utils/isSessionExpired";

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
          idleTimeout: IDLE_TIMEOUT_MILLIS_SECOND,
          disableDefaultIdleCallback: false,
          onIdle: () => {
            authState.logout();
          },
        },
      },
    },
    // Local NFID fork — ICRC-34 delegation adapter.
    // Requests a DelegationChain scoped to backend canisters at login time;
    // all subsequent canister calls go directly via HttpAgent (no per-call approval).
    [NFID_WALLET_ID]: {
      id: NFID_WALLET_ID,
      enabled: true,
      adapter: NFIDSignerAdapter,
      config: {
        walletUrl: `${NFID_WALLET_ORIGIN}/rpc`,
        host: HOST_ICP,
        targets: TARGETS,
        derivationOrigin:
          BUILD_TYPE === "production"
            ? "https://cashierapp.io"
            : typeof window !== "undefined"
              ? window.location.origin
              : undefined,
      },
    },
    // Production NFID Wallet — same ICRC-29/34/49 flow as the local NFID fork.
    [REAL_NFID_WALLET_ID]: {
      id: REAL_NFID_WALLET_ID,
      enabled: true,
      adapter: NFIDSignerAdapter,
      config: {
        walletUrl: `${REAL_NFID_WALLET_ORIGIN}/rpc`,
        host: HOST_ICP,
        targets: TARGETS,
        derivationOrigin:
          BUILD_TYPE === "production"
            ? "https://cashierapp.io"
            : typeof window !== "undefined"
              ? window.location.origin
              : undefined,
      },
    },
    // Cashier Wallet — ICRC-29 iframe wallet with II authentication
    [CASHIER_WALLET_ID]: {
      id: CASHIER_WALLET_ID,
      enabled: true,
      adapter: CashierWalletSignerAdapter,
      config: {
        walletOrigin: CASHIER_WALLET_ORIGIN,
        host: HOST_ICP,
        // Only set derivationOrigin in production — II (https://identity.ic0.app)
        // must be able to GET /.well-known/ii-alternative-origins from this origin
        // to verify the relationship. That fetch is blocked by browsers when the
        // DApp runs on HTTP (localhost), so we skip it for non-production builds.
        derivationOrigin:
          BUILD_TYPE === "production" ? "https://cashierapp.io" : undefined,
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
  id: string | null;
  expiredAtMs: number | null;
}>("connectedWallet", {
  id: null,
  expiredAtMs: null,
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

let sessionManager: SessionManager | null = null;

/**
 * Clear persisted wallet connect state
 */
const resetLoginState = () => {
  walletConnect.current = {
    id: null,
    expiredAtMs: null,
  };
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
  if (
    walletConnect.current.expiredAtMs &&
    isSessionExpired(walletConnect.current.expiredAtMs)
  ) {
    resetLoginState();
    isReady = true;
    return;
  } else if (walletId === II_SIGNER_WALLET_ID) {
    // II supports silent reconnect — it reads from IndexedDB without a popup
    try {
      await authState.login(walletId);
    } catch (error) {
      console.error("Auto-reconnect failed:", error);
      resetLoginState();
    }
  } else if (walletId) {
    // External wallet adapters (e.g. Cashier Wallet) require user interaction
    // to reconnect — clear persisted state so the UI starts fresh
    resetLoginState();
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
   * ID of the currently connected wallet adapter, or null if not connected.
   * e.g. "cashier" for the standalone wallet, "iiSigner" for Internet Identity.
   */
  get connectedWalletId() {
    return walletConnect.current.id;
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

    console.warn("[authState] buildActor", {
      canisterId,
      walletId: walletConnect.current.id,
      provider: pnp.provider?.constructor.name,
    });

    if (
      (walletConnect.current.id === NFID_WALLET_ID ||
        walletConnect.current.id === REAL_NFID_WALLET_ID) &&
      pnp.provider instanceof NFIDSignerAdapter
    ) {
      return pnp.provider.createDelegatedActor<T>(canisterId, idlFactory);
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
      if (walletConnect.current.id) {
        inner_login(walletConnect.current.id);
      }
      break;
    case BroadcastMessageLogout:
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
    resetLoginState();
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};

/**
 * Setup session manager with delegation expiration timeout.
 *
 * For II signer: reads the delegation chain expiry and sets a countdown timer.
 * For other adapters (e.g. Cashier Wallet): persists the wallet ID without
 * an expiry and skips the timer — the session will remain until explicit logout
 * or browser storage is cleared. Full delegation-based expiry for external
 * wallet adapters can be added via icrc34_delegation in a future iteration.
 */
const setupSessionManager = async (walletId: string) => {
  if (!pnp) {
    throw new Error("PNP is not initialized");
  }

  if (walletId !== II_SIGNER_WALLET_ID) {
    // Non-II adapters: just persist wallet ID, no expiry tracking
    walletConnect.current = {
      id: walletId,
      expiredAtMs: null,
    };
    return;
  }

  const iiAdapter = pnp.provider as IISignerAdapter;
  // II always return DelegationIdentity after login
  const delegationIdentity = iiAdapter
    .getAuthClient()
    ?.getIdentity() as DelegationIdentity;

  const delegationExpirationInMillis = calculateDelegationExpirationMs(
    delegationIdentity.getDelegation(),
  );

  // Store last logged in timestamp for session expiration check on next init
  walletConnect.current = {
    id: walletId,
    expiredAtMs: Date.now() + delegationExpirationInMillis,
  };
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

    if (res.owner === null) {
      throw new Error("Login failed: owner is null");
    }

    console.log("Login successful, account:", res);

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
