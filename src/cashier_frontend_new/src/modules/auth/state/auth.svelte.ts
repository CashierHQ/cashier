// DEMO: no need for complex state management tool

import { PNP } from "@windoge98/plug-n-play";
import { IISignerAdapter } from "../signer/ii/IISignerAdapter";
import { FEATURE_FLAGS, HOST_ICP } from "$modules/shared/constants";
import { IC_INTERNET_IDENTITY_PROVIDER, TARGETS, TIMEOUT_NANO_SEC } from "../constants";

export const CONFIG = {
  dfxNetwork: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER ? "local" : "ic",
  replicaPort: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER ? 8000 : undefined,
  hostUrl: HOST_ICP,
  delegationTimeout: TIMEOUT_NANO_SEC,
  delegationTargets: TARGETS,
  fetchRootKey: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER,
  verifyQuerySignatures: false,
  adapters: {
    iiSigner: {
      enabled: true,
      walletName: "Internet Identity",
      website: "https://internetcomputer.org",
      chain: "ICP",
      adapter: IISignerAdapter,
      config: {
        // url to the provider
        iiProviderUrl: IC_INTERNET_IDENTITY_PROVIDER,
        hostUrl: HOST_ICP,
        shouldFetchRootKey: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER,
        // set derivationOrigin for production only
        // this setting allow www.cashierapp.io have the same identity as cashierapp.io
        ...(import.meta.env.MODE === "production" && {
          derivationOrigin: "https://cashierapp.io",
        }),
      },
    },
  },
};

// State variables
let pnp = $state<PNP | null>(null);
// current connected account info
let account = $state<{
  owner: string | null;
  subaccount: string | null;
} | null>(null);
// state to store connected wallet ID for reconnecting later
let connectedWalletId = $state<string | null>(null);
// state to indicate if we are reconnecting
let isReconnecting = $state(false);

// Initialize PNP instance
const initPnp = async () => {
  if (pnp) {
    return;
  }
  const newPnp = new PNP(CONFIG);
  pnp = newPnp;

  // Try to get stored wallet ID from localStorage
  if (typeof window !== "undefined") {
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

export const authState = {
  // Getters account 
  get account() {
    return account;
  },
  // Getter connectedWalletId
  get connectedWalletId() {
    return connectedWalletId;
  },
  // Getter isReconnecting
  get isReconnecting() {
    return isReconnecting;
  },
  // Getter PNP instance
  get provider() {
    return pnp?.provider;
  },
  // Connect to wallet
  async login(walletId: string) {
    if (!pnp) {
      throw new Error("PNP is not initialized");
    }
    try {
      const res = await pnp.connect(walletId);
      account = res;
      connectedWalletId = walletId;
      // Store wallet ID in localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("connectedWalletId", walletId);
      }
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
      account = null;
      connectedWalletId = null;
      // Remove wallet ID from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("connectedWalletId");
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
        account = res;
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

initPnp();
