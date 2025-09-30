import { createPNP, PNP } from "@windoge98/plug-n-play";
import { BUILD_TYPE, HOST_ICP } from "$modules/shared/constants";
import {
  FEATURE_FLAGS,
  IC_INTERNET_IDENTITY_PROVIDER,
  TARGETS,
  TIMEOUT_NANO_SEC,
} from "../constants";
import { accountState } from "$modules/shared/state/auth.svelte";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";

// Config for PNP instance
export const CONFIG = {
  // Network settings
  dfxNetwork: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED ? "local" : "ic",
  // If local dfx network, set replica port
  replicaPort: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED ? 8000 : undefined,
  // Fetch root key for local network
  fetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
  // The host URL of the Internet Computer
  hostUrl: HOST_ICP,
  // Delegation settings
  delegationTimeout: TIMEOUT_NANO_SEC,
  delegationTargets: TARGETS,
  // Whether to verify query signatures
  verifyQuerySignatures: false,
  // Supported wallet adapters
  adapters: {
    ii: {
      enabled: true,
      config: {
        // url to the provider
        iiProviderUrl: IC_INTERNET_IDENTITY_PROVIDER,
        hostUrl: HOST_ICP,
        shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
        //   // set derivationOrigin for production only
        //   // this setting allow www.cashierapp.io have the same identity as cashierapp.io
        ...(BUILD_TYPE === "production" && {
          derivationOrigin: "https://cashierapp.io",
        }),
      },
    },
  },
};

// State variables
let pnp = $state<PNP | null>(null);
// state to store connected wallet ID for reconnecting later
let connectedWalletId = $state<string | null>(null);
// state to indicate if we are reconnecting
let isReconnecting = $state(false);

// Cross-tab auth sync (logout-only)
const AUTH_CHANNEL_NAME = "cashier-auth-event";
let bc: BroadcastChannel | null = null;

// Emit auth event to other tabs
function emitAuthEvent(event: { type: "login" | "logout" }) {
  if (typeof window === "undefined") return;

  // Only send minimal events. For login we don't include wallet identifiers;
  // other tabs will read `connectedWalletId` from localStorage if present.

  // BroadcastChannel for modern browsers
  if (typeof BroadcastChannel !== "undefined") {
    try {
      if (!bc) bc = new BroadcastChannel(AUTH_CHANNEL_NAME);
      bc.postMessage({ type: event.type });
    } catch {
      localStorage.setItem(
        "auth-event",
        JSON.stringify({ type: event.type, ts: Date.now() }),
      );
    }
  }
}

// Handle auth event from other tabs
async function handleRemoteAuthEvent(
  payload: { type: "login" | "logout" } | null,
) {
  if (!payload) return;
  if (payload.type === "logout") {
    // Use the exported logout to centralize behavior. Pass options to avoid
    // broadcasting the event back to other tabs and to avoid calling PNP
    // disconnect (the initiating tab already cleared identity storage).
    try {
      await authState.logout({ broadcast: false, disconnectPNP: false });
    } catch {
      // If logout via authState fails for any reason, fall back to clearing
      // local state to ensure the tab is logged out.
      accountState.account = null;
      connectedWalletId = null;
      isReconnecting = false;
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("connectedWalletId");
        } catch {
          // ignore
        }
      }
    }
    console.log("[auth] remote logout received — cleared local auth state");
    return;
  }

  // If another tab logged in, attempt a best-effort reconnect using the stored
  // `connectedWalletId`. Do not broadcast wallet identifiers — read from localStorage instead.
  if (payload.type === "login") {
    // Best-effort reconnection: use the exported reconnect method which
    // uses the stored `connectedWalletId` if available.
    (async () => {
      try {
        if (accountState.account) return; // already logged in here
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem("connectedWalletId")
            : null;
        if (!stored) return;
        connectedWalletId = stored;
        if (!pnp) {
          await initPnp();
        }
        await authState.reconnect();
        console.log("[auth] remote login: reconnect succeeded");
      } catch {
        console.warn("[auth] remote login: reconnect failed");
      }
    })();
  }
}

// Initialize PNP instance,
const initPnp = async () => {
  if (pnp) {
    return;
  }
  pnp = createPNP(CONFIG);

  // setup BroadcastChannel + storage listener for logout-only sync
  if (typeof window !== "undefined") {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel(AUTH_CHANNEL_NAME);
        bc.onmessage = (ev) => {
          try {
            handleRemoteAuthEvent(ev.data ?? null);
          } catch {
            // ignore
          }
        };
      }
    } catch {
      bc = null;
    }

    window.addEventListener("storage", (e) => {
      try {
        if (e.key === "auth-event" && e.newValue) {
          const parsed = JSON.parse(e.newValue);
          handleRemoteAuthEvent(parsed);
        }
        if (e.key === "connectedWalletId" && e.newValue === null) {
          handleRemoteAuthEvent({ type: "logout" });
        }
      } catch {
        // ignore
      }
    });

    // Try to get stored wallet ID from localStorage
    const storedWalletId = localStorage.getItem("connectedWalletId");
    if (storedWalletId) {
      connectedWalletId = storedWalletId;
      // Auto-reconnect if we have a stored wallet ID
      try {
        await authState.reconnect();
        console.log("Auto-reconnect successful");
      } catch (error) {
        console.error("Auto-reconnect failed:", error);
      }
    }
  }
};

// Exported auth state and actions
export const authState = {
  // Getter connectedWalletId
  get connectedWalletId() {
    return connectedWalletId;
  },
  // Getter isReconnecting
  get isReconnecting() {
    return isReconnecting;
  },
  // Getter PNP provider
  get provider() {
    return pnp?.provider;
  },
  // Getter PNP
  get pnp() {
    return pnp;
  },
  // Connect to wallet
  async login(walletId: string) {
    if (!pnp) {
      throw new Error("PNP is not initialized");
    }
    try {
      const res = await pnp.connect(walletId);
      if (res.owner === null) {
        throw new Error("Login failed: owner is null");
      }
      accountState.account = {
        owner: res.owner,
        subaccount: res.subaccount,
      };
      connectedWalletId = walletId;
      // Store wallet ID in localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("connectedWalletId", walletId);
        // notify other tabs of login (no walletId included)
        try {
          emitAuthEvent({ type: "login" });
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  // Disconnect from wallet
  async logout(opts?: { broadcast?: boolean; disconnectPNP?: boolean }) {
    const { broadcast = true, disconnectPNP = true } = opts || {};
    if (!pnp && disconnectPNP) {
      throw new Error("PNP is not initialized");
    }
    try {
      if (disconnectPNP && pnp) {
        await pnp.disconnect();
      }

      accountState.account = null;
      connectedWalletId = null;

      // Remove wallet ID from localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("connectedWalletId");
        } catch {
          // ignore
        }

        // notify other tabs about logout
        if (broadcast) {
          try {
            emitAuthEvent({ type: "logout" });
          } catch {
            // ignore
          }
        }

        // After logout, navigate to landing page (client-only)
        try {
          goto(resolve("/"), { replaceState: true });
        } catch {
          // ignore navigation errors (e.g. during SSR or if $app/navigation isn't available)
        }
      }
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  },

  // Reconnect to previously connected wallet, if still possible
  async reconnect() {
    if (!pnp) {
      throw new Error("PNP is not initialized");
    }
    if (connectedWalletId) {
      isReconnecting = true;
      try {
        const res = await pnp.connect(connectedWalletId);
        if (res.owner === null) {
          throw new Error("Login failed: owner is null");
        }
        accountState.account = {
          owner: res.owner,
          subaccount: res.subaccount,
        };
        console.log("Auto-reconnect successful");
      } catch (error) {
        console.error("Reconnect failed:", error);
        // Clear stored wallet ID if reconnect fails
        connectedWalletId = null;
        if (typeof window !== "undefined") {
          localStorage.removeItem("connectedWalletId");
        }
        throw error;
      } finally {
        isReconnecting = false;
      }
    }
  },
};

// Immediately initialize PNP instance on module load
initPnp();
