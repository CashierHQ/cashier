import { TypedBroadcastChannel } from "$lib/broadcast";
import { assertUnreachable } from "$lib/rsMatch";
import {
  BUILD_TYPE,
  CASHIER_BACKEND_CANISTER_ID,
  FEATURE_FLAGS,
  HOST_ICP,
  IC_INTERNET_IDENTITY_PROVIDER,
} from "$modules/shared/constants";
import { Buffer } from "buffer";
import { IISignerAdapter } from "$modules/auth/signer/ii/IISignerAdapter";
import { Actor, HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import type {
  BatchCallCanisterRequest,
  BatchCallCanisterResponse,
} from "@slide-computer/signer";
import type { CreatePnpArgs } from "@windoge98/plug-n-play";
import { createPNP, PNP, type ActorSubclass } from "@windoge98/plug-n-play";
import { PersistedState } from "runed";
import { Err, Ok, type Result } from "ts-results-es";

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
    iiSigner: {
      id: "iiSigner",
      enabled: true,
      adapter: IISignerAdapter,
      config: {
        // url to the provider
        iiProviderUrl: IC_INTERNET_IDENTITY_PROVIDER,
        hostUrl: HOST_ICP,
        shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
        // set derivationOrigin for production only
        // this setting allow www.cashierapp.io have the same identity as cashierapp.io
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
const connectedWalletId = new PersistedState<{ id: string | null }>(
  "connectedWallet",
  { id: null },
);

// state to indicate if we are reconnecting
let isConnecting = $state(false);

// state to indicate if the initialization is complete. This does not mean we are logged in.
let isReady = $state(false);

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

  if (connectedWalletId.current.id) {
    try {
      await inner_login(connectedWalletId.current.id);
    } catch (error) {
      console.error("Auto-reconnect failed:", error);
    }
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

    const provider = pnp.provider as IISignerAdapter;

    return provider.getSigner();
  },

  /**
   * Send ICRC-112 batch call request using the connected signer
   * @param icrc112Requests - 2D array of ICRC-112 requests (sequences of parallel requests)
   * @returns Promise that resolves when the batch request is complete
   */
  async sendBatchRequest(
    icrc112Requests: Array<
      Array<{
        canister_id: Principal;
        method: string;
        arg: ArrayBuffer;
        nonce?: ArrayBuffer;
      }>
    >,
  ): Promise<Result<void, Error>> {
    if (!pnp || !pnp.adapter) {
      return Err(new Error("No wallet connected"));
    }

    if (!account) {
      return Err(new Error("No account available"));
    }

    const provider = pnp.provider as IISignerAdapter;
    const signer = provider.getSigner();

    if (!signer) {
      return Err(new Error("No signer available"));
    }

    const requests = icrc112Requests.map((parallelRequests) =>
      parallelRequests.map((request) => ({
        canisterId: request.canister_id.toString(),
        method: request.method,
        arg: Buffer.from(request.arg).toString("base64"),
        ...(request.nonce && {
          nonce: Buffer.from(request.nonce).toString("base64"),
        }),
      })),
    );

    const batchRequest: BatchCallCanisterRequest = {
      jsonrpc: "2.0" as const,
      id: `icrc112_batch_${Date.now()}`,
      method: "icrc112_batch_call_canister",
      params: {
        sender: account.owner,
        requests,
        validation: {
          canisterId: CASHIER_BACKEND_CANISTER_ID,
          method: "icrc114_validate",
        },
      },
    };

    try {
      const res = await signer.sendRequest<
        BatchCallCanisterRequest,
        BatchCallCanisterResponse
      >(batchRequest);

      // Handle and parse the response
      if ("error" in res) {
        console.error("ICRC-112 batch request failed:", res.error);
        return Err(
          new Error(
            `Batch request failed: ${res.error.message} (Code: ${res.error.code})`,
          ),
        );
      }

      if ("result" in res) {
        // Process each sequence of responses
        res.result.responses.forEach(
          (sequenceResponses, sequenceIndex: number) => {
            console.log(
              `Sequence ${sequenceIndex} responses:`,
              sequenceResponses.length,
            );

            sequenceResponses.forEach(
              (parallelResponse, parallelIndex: number) => {
                if ("result" in parallelResponse) {
                  console.log(`  ✅ Parallel ${parallelIndex} - Success:`, {
                    contentMap: parallelResponse.result.contentMap,
                    certificateLength:
                      parallelResponse.result.certificate.length,
                  });
                } else if ("error" in parallelResponse) {
                  console.error(
                    `  ❌ Parallel ${parallelIndex} - Error:`,
                    parallelResponse.error,
                  );
                }
              },
            );
          },
        );

        return Ok(undefined);
      }

      return Err(
        new Error(
          "Invalid response format: missing both result and error properties",
        ),
      );
    } catch (error) {
      console.error("Signer request failed:", error);
      return Err(
        new Error(
          `Signer request failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
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

  // Connect to wallet
  async login(walletId: string) {
    await inner_login(walletId);
    broadcastChannel.post(BroadcastMessageLogin);
  },

  // Disconnect from wallet
  async logout() {
    await inner_logout();
    broadcastChannel.post("Logout");
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
    connectedWalletId.current.id = null;
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};

// Perform login
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
