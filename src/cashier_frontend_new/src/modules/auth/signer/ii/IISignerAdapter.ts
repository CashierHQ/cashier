import { HttpAgent, type ActorSubclass, type Identity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { BaseSignerAdapter } from "@windoge98/plug-n-play";
import { type IIAdapterConfig, isIIAdapterConfig, Status } from "./type";
import { Signer } from "@slide-computer/signer";
import { IITransport } from "./IITransport";
import { FEATURE_FLAGS, IC_HOST } from "$lib/constants";
import { getScreenDimensions } from "../../utils";

interface Account {
  owner: string | null;
  subaccount: string | null;
}

export class IISignerAdapter extends BaseSignerAdapter<IIAdapterConfig> {
  // II specific properties
  private authClient: AuthClient | null = null;
  public identity: Identity | null = null;
  // private agent: HttpAgent | null = null;
  // public signer: Signer | null = null;

  constructor(
    args: { adapter: unknown; config: IIAdapterConfig } | IIAdapterConfig,
  ) {
    // Support simplified constructor in tests: new IIAdapter(config)
    const normalized = ((): { adapter: unknown; config: IIAdapterConfig } => {
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
    this.initializeAuthClientSync();
  }

  protected ensureTransportInitialized(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  private initializeAuthClientSync(): void {
    // Initialize AuthClient with transport for better session management
    AuthClient.create({
      idleOptions: {
        idleTimeout: Number(this.config.timeout ?? 1000 * 60 * 60 * 24), // Default 24 hours
        disableDefaultIdleCallback: true,
      },
    })
      .then(async (client) => {
        this.authClient = client;
        this.authClient.idleManager?.registerCallback?.(() =>
          this.refreshLogin(),
        );
      })
      .catch((err) => {
        this.handleError("Failed to create AuthClient", err);
        this.setState(Status.ERROR);
      });
  }

  private async ensureAuthClient(): Promise<void> {
    if (this.authClient) {
      return;
    }

    // Wait for AuthClient to be initialized
    let attempts = 0;
    while (!this.authClient && attempts < 50) {
      // Max 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.authClient) {
      throw new Error("Failed to initialize AuthClient after 5 seconds");
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
      host: IC_HOST,
      shouldFetchRootKey: FEATURE_FLAGS.ENABLE_LOCAL_IDENTITY_PROVIDER,
    });
    const transport = await IITransport.create({
      agent,
    });

    this.agent = agent;
    this.signer = new Signer({
      transport,
    });
  }

  async connect(): Promise<Account> {
    try {
      this.setState(Status.CONNECTING);

      // Ensure AuthClient is ready
      await this.ensureAuthClient();

      // Check if already authenticated before opening popup
      const isAuthenticated = await this.authClient!.isAuthenticated();

      if (isAuthenticated) {
        const identity = this.authClient!.getIdentity();
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
          this.setState(Status.CONNECTED);
          return account;
        }
      }

      // Not authenticated or invalid session - open login popup
      return await this.performLogin();
    } catch (error) {
      this.setState(Status.ERROR);
      throw error;
    }
  }

  private async performLogin(): Promise<Account> {
    return new Promise<Account>((resolve, reject) => {
      const loginOptions = {
        derivationOrigin: this.config.derivationOrigin,
        identityProvider: this.config.iiProviderUrl || "https://id.ai",
        maxTimeToLive: BigInt(
          (this.config.timeout ?? 1 * 24 * 60 * 60) * 1000 * 1000 * 1000,
        ), // Default 1 day
        windowOpenerFeatures: (() => {
          const screen = getScreenDimensions();
          return `width=500,height=600,left=${screen.width / 2 - 250},top=${screen.height / 2 - 300}`;
        })(),
        onSuccess: async () => {
          try {
            const identity = this.authClient!.getIdentity();
            const account: Account = {
              owner: identity.getPrincipal().toText(),
              subaccount: null,
            };
            this.identity = identity;
            await this.initAgentAndSigner(identity);

            this.setState(Status.CONNECTED);
            resolve(account);
          } catch (error) {
            this.setState(Status.ERROR);
            reject(error);
          }
        },
        onError: (error?: string) => {
          this.handleError("Login error", error || "Unknown error");
          this.setState(Status.ERROR);
          reject(
            new Error(`II Authentication failed: ${error || "Unknown error"}`),
          );
        },
      };

      console.log("Starting II login with options:", loginOptions);
      this.authClient!.login(loginOptions);
    });
  }

  async isConnected(): Promise<boolean> {
    return this.authClient ? await this.authClient.isAuthenticated() : false;
  }

  // Implementation for BaseIcAdapter actor caching
  protected createActorInternal<T>(
    canisterId: string,
    idl: Record<string, unknown>,
  ): ActorSubclass<T> {
    if (!this.agent) {
      throw new Error("Agent not initialized. Connect first.");
    }

    return this.createActorWithAgent<T>(
      this.agent as HttpAgent,
      canisterId,
      idl,
    );
  }

  async getPrincipal(): Promise<string> {
    if (!this.authClient) throw new Error("Not connected");
    const identity = this.authClient.getIdentity();
    if (!identity) throw new Error("Identity not available");
    const principal = identity.getPrincipal();
    return principal.toText();
  }

  private async refreshLogin(): Promise<void> {
    try {
      await this.ensureAuthClient();
      await this.performLogin();
    } catch (error) {
      this.handleError("Failed to refresh login", error);
      await this.disconnect().catch(() => {});
    }
  }

  // Disconnect logic specific to II
  protected async disconnectInternal(): Promise<void> {
    if (this.authClient) {
      await this.authClient.logout();
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
    if (this.authClient) {
      try {
        await this.authClient.logout();
      } catch (error) {
        console.error("Error during AuthClient logout:", error);
      }
      this.authClient = null;
    }
    this.agent = null;
  }

  public getSigner(): Signer | null {
    return this.signer;
  }
}