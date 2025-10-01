import {
  BUILD_TYPE,
  FEATURE_FLAGS,
  HOST_ICP,
  IC_INTERNET_IDENTITY_PROVIDER,
} from "$modules/shared/constants";
import { accountState } from "$modules/shared/state/auth.svelte";
import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import type { CreatePnpArgs } from "@windoge98/plug-n-play";
import { createPNP, PNP, type ActorSubclass } from "@windoge98/plug-n-play";

// Config for PNP instance
export const CONFIG: CreatePnpArgs = {
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

// Plug-n-play global instance
let pnp: PNP | null = null;

// state to store connected wallet ID for reconnecting later
let connectedWalletId = $state<string | null>(null);
// state to indicate if we are reconnecting
let isReconnecting = $state(false);
// Account state
let account = $state<{
  owner: string;
  subaccount: string | null;
} | null>(null);

// Initialize PNP instance,
const initPnp = async () => {
  if (pnp) {
    return;
  }
  pnp = createPNP(CONFIG);

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

// Exported auth state and actions
export const authState = {

    // Return true if the user is logged in
  get isLoggedIn() {
    return account !== null;
  },

  // Return current account information, null if not logged in
  get account() {
    return account;
  },

  // Update account information, normally set after login/logout
  set account(value: { owner: string; subaccount: string | null } | null) {
    account = value;
  },

  // Getter connectedWalletId
  get connectedWalletId() {
    return connectedWalletId;
  },

  // Getter isReconnecting
  get isReconnecting() {
    return isReconnecting;
  },

  /**
   * Build an anonymous HttpAgent instance.
   * @param host Optional host URL for the IC replica
   * @returns An anonymous HttpAgent instance
   */
  buildAnonymousAgent(host: string = HOST_ICP) {
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
  buildActor<T>(
    {canisterId, idlFactory, options}: {canisterId: string | Principal; idlFactory: IDL.InterfaceFactory; options?: {
      anonymous?: boolean;
      host?: string;
    }},
  ): ActorSubclass<T> | null {
    // return anonymous actor if no PNP, or option set to anonymous
    if (!pnp || options?.anonymous) {
      return Actor.createActor(idlFactory, {
        agent: this.buildAnonymousAgent(options?.host),
        canisterId: canisterId,
      });
    }

    if (!accountState.account) {
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
      accountState.account = null;
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
