import { TARGETS } from "$modules/auth/constants";
import { FEATURE_FLAGS, HOST_ICP } from "$modules/shared/constants";
import { Actor, HttpAgent, type ActorSubclass } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { DelegationIdentity, Ed25519KeyIdentity } from "@dfinity/identity";
import { Principal } from "@dfinity/principal";
import { Signer } from "@slide-computer/signer";
import { PostMessageTransport } from "@slide-computer/signer-web";
import type { AdapterConstructorArgs } from "@windoge98/plug-n-play";
import { BaseSignerAdapter } from "@windoge98/plug-n-play";

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
  /** Origin used by the wallet to derive the delegated identity */
  derivationOrigin?: string;
}

interface Account {
  owner: string | null;
  subaccount: string | null;
}

const DEFAULT_MAX_TIME_TO_LIVE = BigInt(8 * 60 * 60 * 1_000_000_000); // 8 hours in ns

const arrayBufferToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/**
 * PNP adapter that authenticates via NFID using a hybrid ICRC-34 + ICRC-49 flow.
 *
 * Login flow:
 *  1. Open NFID /rpc as a popup — ICRC-29 channel established.
 *  2. icrc25_request_permissions  → user approves icrc27, icrc34, icrc49 once.
 *  3. icrc27_accounts             → fetch user's principal.
 *  4. icrc34_delegation           → get a DelegationChain scoped to backend canisters.
 *  5. Build HttpAgent from delegation for direct backend calls (no per-call approval).
 *  6. Keep popup open; store PostMessageTransport signer for ICRC-49 token transfers.
 *
 * Token transfer flow (icrc1_transfer / icrc2_approve):
 *  - Routed through ICRC-49 via the open NFID popup — user approves each transfer.
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
      derivationOrigin,
    } = this.config;

    // Phase 1 — open NFID popup and establish ICRC-29 channel
    const transport = new PostMessageTransport({
      url: walletUrl,
      establishTimeout,
    });

    // Keep the channel open long enough for the login request sequence, then
    // let signer-js close the /rpc tab. Future transfer approvals can reopen it
    // from the stored transport when triggered by a user click.
    const signer = new Signer({
      transport,
      autoCloseTransportChannel: true,
      closeTransportChannelAfter: 2_000,
      derivationOrigin,
    });

    // Phase 2 — request permissions (one-time approval in NFID popup)
    await signer.requestPermissions([
      { method: "icrc27_accounts" },
      { method: "icrc34_delegation" },
      { method: "icrc49_call_canister" },
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

    // Phase 5 — build delegation identity and HttpAgent for direct IC calls
    // to canisters in the delegation targets (cashier_backend, token_storage).
    this.delegationIdentity = DelegationIdentity.fromDelegation(
      sessionKey,
      delegationChain,
    );

    this.agent = HttpAgent.createSync({
      identity: this.delegationIdentity,
      host,
      shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
    });

    // Phase 6 — store the PostMessageTransport-backed signer so token transfers
    // can go through ICRC-49 and reopen the NFID approval tab on demand.
    this.signer = signer;

    return {
      owner: ownerPrincipal.toText(),
      subaccount: null,
    };
  }

  async isConnected(): Promise<boolean> {
    return this.delegationIdentity !== null;
  }

  async getPrincipal(): Promise<string> {
    if (!this.delegationIdentity)
      throw new Error("NFIDSignerAdapter: not connected");
    return this.delegationIdentity.getPrincipal().toText();
  }

  createDelegatedActor<T>(
    canisterId: string,
    idl: IDL.InterfaceFactory,
  ): ActorSubclass<T> {
    if (!this.agent) {
      throw new Error(
        "NFIDSignerAdapter: not connected — call connect() first",
      );
    }

    return Actor.createActor<T>(idl, {
      agent: this.agent as HttpAgent,
      canisterId,
    });
  }

  protected createActorInternal<T>(
    canisterId: string,
    idl: Record<string, unknown>,
  ): ActorSubclass<T> {
    if (!this.agent) {
      throw new Error(
        "NFIDSignerAdapter: not connected — call connect() first",
      );
    }

    return this.createActorWithAgent<T>(
      this.agent as HttpAgent,
      canisterId,
      idl,
    );
  }

  protected async disconnectInternal(): Promise<void> {
    await this.signer?.closeChannel();
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
