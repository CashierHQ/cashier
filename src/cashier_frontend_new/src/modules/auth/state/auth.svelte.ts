import { createPNP, PNP } from "@windoge98/plug-n-play";
import { BUILD_TYPE, HOST_ICP } from "$modules/shared/constants";
import {
  CONNECT_WALLET_ID_KEY,
  FEATURE_FLAGS,
  IC_INTERNET_IDENTITY_PROVIDER,
  TARGETS,
  TIMEOUT_NANO_SEC,
} from "../constants";
import { accountState } from "$modules/shared/state/auth.svelte";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { handleStorageChange } from "../services/crossTabAuth";

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
    nfid: {
      enabled: true,
    },
  },
};

// State variables
let pnp = $state<PNP | null>(null);
// state to store connected wallet ID for reconnecting later
let connectedWalletId = $state<string | null>(null);
// state to indicate if we are reconnecting
let isReconnecting = $state(false);
// state to indicate if PNP is initialized
// default to "initializing", set to "initialized" after initPnp completes
let initState = $state<"initializing" | "initialized">("initializing");

// Initialize PNP instance,
const initPnp = async () => {
  if (pnp) {
    return;
  }
  pnp = createPNP(CONFIG);
  initState = "initialized";

  if (typeof window !== "undefined") {
    // Try to get stored wallet ID from localStorage (still used for reconnect persistence)
    const storedWalletId = localStorage.getItem(CONNECT_WALLET_ID_KEY);
    if (storedWalletId) {
      connectedWalletId = storedWalletId;
      try {
        await authState.reconnect();
      } catch (error) {
        console.error("Auto-reconnect failed:", error);
      }
    }
  }

};

// Listen for storage changes from other tabs/windows. We care about CONNECT_WALLET_ID_KEY
// If the key is removed elsewhere, we should logout locally to keep state consistent.
if (typeof window !== "undefined") {
  window.addEventListener("storage", handleStorageChange);
}

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
  // Getter isInit
  get initState() {
    return initState;
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
      localStorage.setItem(CONNECT_WALLET_ID_KEY, walletId);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  // Disconnect from wallet
  async logout() {
    if (!pnp) {
      throw new Error("PNP is not initialized");
    }
    try {
      await pnp.disconnect();
      accountState.account = null;
      connectedWalletId = null;
      localStorage.removeItem(CONNECT_WALLET_ID_KEY);
      goto(resolve("/"), { replaceState: true });
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
    // If we don't have an in-memory connectedWalletId (e.g. storage event), try reading from localStorage
    let targetWalletId = connectedWalletId;
    if (!targetWalletId && typeof window !== "undefined") {
      targetWalletId = localStorage.getItem(CONNECT_WALLET_ID_KEY);
      if (targetWalletId) {
        connectedWalletId = targetWalletId;
      }
    }

    if (targetWalletId) {
      isReconnecting = true;
      try {
        const res = await pnp.connect(targetWalletId);
        console.log("Reconnected to wallet:", targetWalletId);
        if (res.owner === null) {
          throw new Error("Login failed: owner is null");
        }
        accountState.account = {
          owner: res.owner,
          subaccount: res.subaccount,
        };
      } catch (error) {
        // Clear stored wallet ID if reconnect fails
        connectedWalletId = null;
        if (typeof window !== "undefined") {
          localStorage.removeItem(CONNECT_WALLET_ID_KEY);
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
