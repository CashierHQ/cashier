import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent } from "@dfinity/agent";
import { browser } from "$app/environment";
import {
  BUILD_TYPE,
  HOST_ICP,
  IC_INTERNET_IDENTITY_PROVIDER,
  FEATURE_FLAGS,
} from "$modules/shared/constants";
import { DELEGATION_TIMEOUT_NS, IDLE_TIMEOUT_MS } from "./constants";

let authClient: AuthClient | null = null;
let initFailed = $state(false);
let isReady = $state(false);
let isConnecting = $state(false);
let principal = $state<string | null>(null);

// Derivation origin must match the cashier frontend's origin per environment
// so wallet users get the same principal as cashier users
const DERIVATION_ORIGINS: Record<string, string> = {
  production: "https://cashierapp.io",
  staging: "https://staging.cashierapp.io",
  dev: "https://dev.cashierapp.io",
};

const getDerivationOrigin = (): string | undefined => {
  return DERIVATION_ORIGINS[BUILD_TYPE];
};

const init = async () => {
  if (!browser) return;

  try {
    authClient = await AuthClient.create({
      idleOptions: {
        idleTimeout: IDLE_TIMEOUT_MS,
        disableDefaultIdleCallback: false,
        onIdle: () => {
          authState.logout();
        },
      },
    });

    const isAuthenticated = await authClient.isAuthenticated();
    if (isAuthenticated) {
      const identity = authClient.getIdentity();
      const p = identity.getPrincipal();
      if (!p.isAnonymous()) {
        principal = p.toText();
      }
    }
  } catch (error) {
    console.error("AuthClient init failed:", error);
    initFailed = true;
  }

  isReady = true;
};

export const authState = {
  get isReady() {
    return isReady;
  },
  get isLoggedIn() {
    return isReady && principal !== null;
  },
  get isConnecting() {
    return isConnecting;
  },
  get principal() {
    return principal;
  },

  // Build authenticated HttpAgent for backend calls
  getAgent(): HttpAgent | null {
    if (!authClient) return null;
    const identity = authClient.getIdentity();
    if (identity.getPrincipal().isAnonymous()) return null;
    return HttpAgent.createSync({
      identity,
      host: HOST_ICP,
      shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
    });
  },

  // Build anonymous HttpAgent (no auth needed)
  buildAnonymousAgent(host: string = HOST_ICP): HttpAgent {
    return HttpAgent.createSync({
      host,
      shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
    });
  },

  async login() {
    if (!authClient) throw new Error("AuthClient not initialized");
    isConnecting = true;
    try {
      await new Promise<void>((resolve, reject) => {
        authClient!.login({
          derivationOrigin: getDerivationOrigin(),
          identityProvider: IC_INTERNET_IDENTITY_PROVIDER,
          maxTimeToLive: DELEGATION_TIMEOUT_NS,
          onSuccess: () => {
            const identity = authClient!.getIdentity();
            principal = identity.getPrincipal().toText();
            resolve();
          },
          onError: (err) => reject(new Error(err || "II auth failed")),
        });
      });
    } finally {
      isConnecting = false;
    }
  },

  async logout() {
    if (authClient) {
      await authClient.logout();
    }
    principal = null;
  },
};

// Auto-init on module load
init();
