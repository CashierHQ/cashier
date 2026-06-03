import {
  Actor,
  HttpAgent,
  type ActorSubclass,
  type Identity,
} from "@icp-sdk/core/agent";
import { AuthClient } from "@icp-sdk/auth/client";
import { Adapter, BaseSignerAdapter } from "@windoge98/plug-n-play";
import {
  type IIAdapterConfig,
  isIIAdapterConfig,
} from "$modules/auth/signer/ii/type";
import { IITransport } from "$modules/auth/signer/ii/IITransport";
import { FEATURE_FLAGS, HOST_ICP } from "$modules/shared/constants";
import { getScreenDimensions } from "$modules/shared/utils/getScreenDimensions";
import { Signer } from "@slide-computer/signer";

/**
 * Account interface representing the connected user's account details.
 */
interface Account {
  owner: string | null;
  subaccount: string | null;
}

/**
 * IISignerAdapter integrates Internet Identity (II) with the Plug and Play (PNP).
 * By default PNP support a IIAdapter from plug-n-play, but it doesn't use signer-js
 * which is required for the new transaction flow in Cashier.
 * This adapter implements II support using signer-js.
 *
 * v5 notes (icp-sdk migration):
 * - AuthClient is constructed via `new AuthClient(opts)` (was static `AuthClient.create`)
 * - `identityProvider`, `derivationOrigin`, `windowOpenerFeatures` moved to constructor opts
 * - `signIn(opts?) -> Promise<Identity>` replaces callback-style `login`
 * - `signOut()` replaces `logout`
 * - `isAuthenticated()` is now synchronous
 * - `getIdentity()` is now async
 */
export class IISignerAdapter extends BaseSignerAdapter<IIAdapterConfig> {
  // II specific properties
  private authClient: AuthClient | null = null;
  private identity: Identity | null = null;

  constructor(
    args:
      | { adapter: Adapter.Config; config: IIAdapterConfig }
      | IIAdapterConfig,
  ) {
    // Support simplified constructor in tests: new IIAdapter(config)
    const normalized = ((): {
      adapter: Adapter.Config;
      config: IIAdapterConfig;
    } => {
      if ("config" in args) {
        return args;
      }
      return {
        adapter: {
          id: "ii",
          enabled: true,
          walletName: "Internet Identity",
          logo: undefined,
          website: "https://internetcomputer.org",
          chain: "ICP",
          adapter: IISignerAdapter,
          config: {},
        },
        config: args,
      };
    })();

    if (!isIIAdapterConfig(normalized.config)) {
      throw new Error("Invalid config for IIAdapter");
    }
    super(normalized);

    // Initialize AuthClient immediately for Safari compatibility
    // This happens during app initialization, not during user interaction
    this.initializeAuthClient();
  }

  getAuthClient(): AuthClient | null {
    return this.authClient;
  }

  // v5: AuthClient is constructed synchronously, transport setup is deferred to connect()
  protected ensureTransportInitialized(): Promise<void> {
    return Promise.resolve();
  }

  private initializeAuthClient(): void {
    try {
      // v5: AuthClient constructor accepts identity provider URL, derivation origin,
      // and window opener features directly (previously passed to login())
      this.authClient = new AuthClient({
        idleOptions: this.config.idleOptions,
        identityProvider: this.config.iiProviderUrl || "https://id.ai",
        derivationOrigin: this.config.derivationOrigin,
        windowOpenerFeatures: (() => {
          const screen = getScreenDimensions();
          return `width=500,height=600,left=${screen.width / 2 - 250},top=${screen.height / 2 - 300},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
        })(),
      });
    } catch (err) {
      this.handleError("Failed to create AuthClient", err);
      this.setState(Adapter.Status.ERROR);
    }
  }

  async openChannel(): Promise<void> {
    // No-op for II adapter - AuthClient is initialized in constructor
    // This method exists for compatibility with other adapters
    return Promise.resolve();
  }

  // Use the resolved config for agent initialization
  private async initAgentAndSigner(identity: Identity): Promise<void> {
    const agent = HttpAgent.createSync({
      identity,
      host: HOST_ICP,
      shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
    });
    const transport = await IITransport.create({
      agent,
    });

    this.agent = agent;
    // Plug-N-Play exposes @icp-sdk/signer types, while this adapter still uses
    // the slide-computer signer implementation expected by the current flow.
    this.signer = new Signer<IITransport>({
      transport: transport,
    }) as unknown as typeof this.signer;
  }

  async connect(): Promise<Account> {
    try {
      this.setState(Adapter.Status.CONNECTING);

      if (!this.authClient) {
        throw new Error("AuthClient not initialized");
      }

      // v5: isAuthenticated is synchronous, getIdentity is async
      if (this.authClient.isAuthenticated()) {
        const identity = await this.authClient.getIdentity();
        const principal = identity?.getPrincipal();

        if (identity && principal && !principal.isAnonymous()) {
          const account: Account = {
            owner: identity.getPrincipal().toText(),
            subaccount: null,
          };
          // Initialize agent if not already done
          if (!this.agent) {
            await this.initAgentAndSigner(identity);
          }
          this.setState(Adapter.Status.CONNECTED);
          return account;
        }
      }

      // Not authenticated or invalid session - open login popup
      return await this.performLogin();
    } catch (error) {
      this.setState(Adapter.Status.ERROR);
      throw error;
    }
  }

  // v5: signIn() returns Promise<Identity> directly; identityProvider/derivationOrigin/
  // windowOpenerFeatures moved to AuthClient constructor (set in initializeAuthClient)
  private async performLogin(): Promise<Account> {
    if (!this.authClient) {
      throw new Error("AuthClient not initialized");
    }
    try {
      const identity = await this.authClient.signIn({
        maxTimeToLive:
          this.config.delegationTimeout ?? BigInt(60 * 60 * 1000 * 1000 * 1000), // Default 1 hour in nanoseconds
      });
      const account: Account = {
        owner: identity.getPrincipal().toText(),
        subaccount: null,
      };
      this.identity = identity;
      await this.initAgentAndSigner(identity);

      this.setState(Adapter.Status.CONNECTED);
      return account;
    } catch (error) {
      this.handleError("Login error", error);
      this.setState(Adapter.Status.ERROR);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`II Authentication failed: ${message}`, { cause: error });
    }
  }

  async isConnected(): Promise<boolean> {
    // v5: isAuthenticated is now synchronous
    return this.authClient ? this.authClient.isAuthenticated() : false;
  }

  // Implementation for BaseIcAdapter actor caching
  // v5: createActorWithAgent removed; use Actor.createActor directly
  protected createActorInternal<T>(
    canisterId: string,
    idl: Record<string, unknown>,
  ): ActorSubclass<T> {
    if (!this.agent) {
      throw new Error("Agent not initialized. Connect first.");
    }

    return Actor.createActor<T>(idl as never, {
      agent: this.agent as HttpAgent,
      canisterId,
    });
  }

  async getPrincipal(): Promise<string> {
    if (!this.authClient) throw new Error("Not connected");
    // v5: getIdentity is async
    const identity = await this.authClient.getIdentity();
    if (!identity) throw new Error("Identity not available");
    const principal = identity.getPrincipal();
    return principal.toText();
  }

  // Disconnect logic specific to II
  // v5: signOut replaces logout
  protected async disconnectInternal(): Promise<void> {
    if (this.authClient) {
      await this.authClient.signOut();
    }
  }

  // Cleanup logic specific to II
  protected cleanupInternal(): void {
    this.authClient = null;
    this.agent = null;
  }

  /**
   * Dispose of II-specific resources
   * Ensures AuthClient and agent are properly cleaned up
   */
  protected async onDispose(): Promise<void> {
    // Ensure logout if still connected
    // v5: signOut replaces logout
    if (this.authClient) {
      try {
        await this.authClient.signOut();
      } catch (error) {
        console.error("Error during AuthClient signOut:", error);
      }
      this.authClient = null;
    }
    this.agent = null;
  }
}
