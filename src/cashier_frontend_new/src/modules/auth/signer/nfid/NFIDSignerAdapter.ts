import { HttpAgent, type ActorSubclass } from "@dfinity/agent";
import { DelegationIdentity, Ed25519KeyIdentity } from "@dfinity/identity";
import { Principal } from "@dfinity/principal";
import { Signer } from "@slide-computer/signer";
import { PostMessageTransport } from "@slide-computer/signer-web";
import type { AdapterConstructorArgs } from "@windoge98/plug-n-play";
import { BaseSignerAdapter } from "@windoge98/plug-n-play";
import { TARGETS } from "$modules/auth/constants";
import { FEATURE_FLAGS, HOST_ICP } from "$modules/shared/constants";
import { IITransport } from "$modules/auth/signer/ii/IITransport";

export interface NFIDSignerConfig {
  /** Full URL to the NFID RPC endpoint, e.g. "http://localhost:9090/rpc" */
  walletUrl: string;
  /** ICP replica host */
  host?: string;
  /** Canister IDs the delegation is scoped to (no per-call approval needed for these) */
  targets?: string[];
  /** ICRC-29 channel establishment timeout in ms @default 60000 */
  establishTimeout?: number;
  /** Delegation max lifetime in nanoseconds @default 8 hours */
  maxTimeToLive?: bigint;
}

interface Account {
  owner: string | null;
  subaccount: string | null;
}

const DEFAULT_MAX_TIME_TO_LIVE = BigInt(8 * 60 * 60 * 1_000_000_000); // 8 hours in ns

/**
 * PNP adapter that authenticates via NFID using ICRC-34 delegation.
 *
 * Flow:
 *  1. Open NFID /rpc as a popup — ICRC-29 channel established.
 *  2. icrc25_request_permissions  → user approves once.
 *  3. icrc27_accounts             → fetch user's principal.
 *  4. icrc34_delegation           → get a DelegationChain scoped to target canisters.
 *  5. Close NFID popup.
 *  6. All subsequent canister calls go directly via HttpAgent — no per-call approval.
 */
export class NFIDSignerAdapter extends BaseSignerAdapter<NFIDSignerConfig> {
  private delegationIdentity: DelegationIdentity | null = null;

  constructor(args: AdapterConstructorArgs<NFIDSignerConfig>) {
    if (!args.config?.walletUrl) {
      throw new Error("NFIDSignerAdapter: walletUrl is required in config");
    }
    super(args);
  }

  protected async ensureTransportInitialized(): Promise<void> {
    // Transport lifecycle is managed inside connect().
  }

  async connect(): Promise<Account> {
    const {
      walletUrl,
      host = HOST_ICP,
      targets = TARGETS,
      establishTimeout = 60_000,
      maxTimeToLive = DEFAULT_MAX_TIME_TO_LIVE,
    } = this.config;

    // Phase 1 — open NFID popup and establish ICRC-29 channel
    const transport = new PostMessageTransport({
      url: walletUrl,
      establishTimeout,
    });

    // autoCloseTransportChannel: false so we can make multiple requests
    // before closing the popup ourselves after the delegation is obtained.
    const signer = new Signer({ transport, autoCloseTransportChannel: false });

    // Phase 2 — request permissions (one-time approval in NFID popup)
    await signer.requestPermissions([
      { method: "icrc27_accounts" },
      { method: "icrc34_delegation" },
    ]);

    // Phase 3 — get user's principal
    const accounts = await signer.accounts();
    const ownerPrincipal = accounts[0]?.owner;
    if (!ownerPrincipal) {
      throw new Error("NFIDSignerAdapter: no accounts returned from NFID");
    }

    // Phase 4 — generate ephemeral session key and request scoped delegation
    const sessionKey = Ed25519KeyIdentity.generate();
    const targetPrincipals = targets.map((t) => Principal.fromText(t));

    const delegationChain = await signer.delegation({
      publicKey: sessionKey.getPublicKey().toDer(),
      targets: targetPrincipals,
      maxTimeToLive,
    });

    // Phase 5 — close NFID popup; delegation is now held locally
    await signer.closeChannel();

    // Phase 6 — build delegation identity and HttpAgent for direct IC calls
    this.delegationIdentity = DelegationIdentity.fromDelegation(
      sessionKey,
      delegationChain,
    );

    this.agent = HttpAgent.createSync({
      identity: this.delegationIdentity,
      host,
      shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
    });

    // Wrap the agent in IITransport so PNP's getSigner() works for ICRC-1/2 ops
    const iiTransport = await IITransport.create({
      agent: this.agent as HttpAgent,
    });
    this.signer = new Signer({ transport: iiTransport });

    return {
      owner: ownerPrincipal.toText(),
      subaccount: null,
    };
  }

  async isConnected(): Promise<boolean> {
    return this.delegationIdentity !== null;
  }

  async getPrincipal(): Promise<string> {
    if (!this.delegationIdentity) throw new Error("NFIDSignerAdapter: not connected");
    return this.delegationIdentity.getPrincipal().toText();
  }

  protected createActorInternal<T>(
    canisterId: string,
    idl: Record<string, unknown>,
  ): ActorSubclass<T> {
    if (!this.agent) {
      throw new Error("NFIDSignerAdapter: not connected — call connect() first");
    }
    return this.createActorWithAgent<T>(this.agent as HttpAgent, canisterId, idl);
  }

  protected async disconnectInternal(): Promise<void> {
    this.delegationIdentity = null;
  }

  protected cleanupInternal(): void {
    this.delegationIdentity = null;
    this.agent = null;
    this.signer = null;
  }

  protected async onDispose(): Promise<void> {
    this.cleanupInternal();
  }
}
