import { HttpAgent } from "@icp-sdk/core/agent";
import type { Transport } from "@icp-sdk/signer";
import { Signer } from "@icp-sdk/signer";
import { SignerAgent } from "@icp-sdk/signer/agent";
import type { AdapterConstructorArgs } from "@windoge98/plug-n-play";
import { BaseSignerAdapter } from "@windoge98/plug-n-play";
import { IframeTransport } from "./IframeTransport";

// ── Config ────────────────────────────────────────────────────────────────

export interface CashierWalletAdapterConfig {
  /**
   * Full origin URL of the Cashier Wallet app.
   * @example 'https://wallet.cashierapp.io'
   * @example 'http://localhost:5177'
   */
  walletOrigin: string;
  /**
   * Optional ICP replica host for the SignerAgent.
   * For local development pass `'http://localhost:8000'`.
   * @default 'https://icp-api.io'
   */
  host?: string;
  /**
   * ICRC-29 channel establishment timeout in ms.
   * @default 120000
   */
  establishTimeout?: number;
  /**
   * ICRC-29 heartbeat disconnect timeout in ms.
   * Must exceed the longest expected IC update call (~10 s on mainnet) AND
   * any user-interaction delay (e.g. ICRC-21 consent popup).
   * @default 120000
   */
  disconnectTimeout?: number;
  /**
   * Internet Identity derivation origin.
   * Set this to the DApp's origin so that the wallet derives the same
   * principal as a direct II login from the DApp.
   * @example 'https://cashierapp.io'
   * @example 'http://localhost:3000'
   */
  derivationOrigin?: string;
}

// ── Adapter ───────────────────────────────────────────────────────────────

interface Account {
  owner: string | null;
  subaccount: string | null;
}

const POPUP_CLOSED_CHECK_MS = 500;
const POPUP_TIMEOUT_MS = 5 * 60 * 1_000; // 5 min

/**
 * PNP adapter that connects to the Cashier Wallet via:
 *  1. A popup window for Internet Identity authentication (user gesture path)
 *  2. A hidden iframe for all subsequent ICRC-29/25/27/49 operations
 *
 * Integrate by adding it to the PNP CONFIG adapters object:
 * ```typescript
 * cashierWallet: {
 *   id: 'cashierWallet',
 *   enabled: true,
 *   adapter: CashierWalletSignerAdapter,
 *   config: { walletOrigin: 'https://wallet.cashierapp.io' },
 * }
 * ```
 */
export class CashierWalletSignerAdapter extends BaseSignerAdapter<CashierWalletAdapterConfig> {
  private iframeTransport: IframeTransport | null = null;
  private principalText: string | null = null;

  constructor(args: AdapterConstructorArgs<CashierWalletAdapterConfig>) {
    if (
      typeof args.config !== "object" ||
      args.config === null ||
      !("walletOrigin" in args.config) ||
      typeof (args.config as CashierWalletAdapterConfig).walletOrigin !==
        "string"
    ) {
      throw new Error(
        "CashierWalletSignerAdapter: invalid config — walletOrigin is required"
      );
    }
    super(args);
  }

  // The transport is set up in connect(), not here
  protected async ensureTransportInitialized(): Promise<void> {
    // No-op: transport lifecycle managed in connect() / disconnectInternal()
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  /**
   * Full connection flow:
   *  1. Open the wallet as a popup → user completes II login → popup sends
   *     `wallet_auth_complete` with the principal and closes.
   *  2. Mount a hidden iframe to the same wallet origin.
   *  3. Perform ICRC-29 handshake via HeartbeatClient.
   *  4. Request permissions (icrc27_accounts, icrc49_call_canister).
   *  5. Fetch the accounts list to confirm authentication.
   *  6. Return `{ owner, subaccount }` to PNP.
   */
  async connect(): Promise<Account> {
    const {
      walletOrigin,
      host = "https://icp-api.io",
      establishTimeout = 120_000,
      disconnectTimeout = 120_000,
    } = this.config;

    // Phase 1 — II login via popup.
    // NOTE: `config.derivationOrigin` is intentionally NOT forwarded here.
    // ICRC-95 derivation-origin support is deferred (see plan unresolved Q#1).
    // The field is retained on the config interface for future enablement.
    const principal = await this.openLoginPopup(walletOrigin);
    this.principalText = principal;

    // Phase 2 — mount iframe + ICRC-29 transport
    this.iframeTransport = new IframeTransport({
      url: walletOrigin,
      establishTimeout,
      disconnectTimeout,
    });
    const signer = new Signer<Transport>({
      transport: this.iframeTransport,
      // Keep the channel alive across calls (we re-use the iframe)
      autoCloseTransportChannel: false,
    });
    this.signer = signer;

    // Phase 3 — request permissions (shows ICRC-25 permission prompt in wallet)
    try {
      await signer.requestPermissions([
        { method: "icrc27_accounts" },
        { method: "icrc49_call_canister" },
      ]);
    } catch (e: unknown) {
      // ICRC-25 error code 3001 (ACTION_ABORTED) means user denied permissions
      const code = (e as { code?: number })?.code;
      if (
        code === 3001 ||
        String(e).toLowerCase().includes("abort") ||
        String(e).toLowerCase().includes("denied")
      ) {
        throw new Error("User denied wallet permissions");
      }
      throw e;
    }

    // Phase 4 — verify accounts
    const accounts = await signer.getAccounts();
    const ownerPrincipal = accounts[0]?.owner;
    const ownerText = ownerPrincipal ? ownerPrincipal.toText() : principal;

    // Phase 5 — SignerAgent routes ALL canister traffic through wallet via ICRC-49.
    // Queries are upgraded to authenticated update calls internally so callers
    // relying on ic_cdk::caller() (e.g. user_get_links_v3) work correctly.
    const signerAgent = SignerAgent.createSync({
      signer,
      account: ownerPrincipal,
      agent: HttpAgent.createSync({ host }),
    });
    this.signerAgent = signerAgent;
    // Mirror onto `this.agent` so parent BaseSignerAdapter.isConnected() and
    // any contract-level consumers see a non-null agent.
    this.agent = signerAgent;

    // ── TEMP DIAGNOSTIC: count SignerAgent instances ────────────────────────
    // Multiple SignerAgents = multiple #pending queues = possible OISY BUSY
    // collisions. Each instance prints its creation count + unique-instance set.
    // Remove once root cause is confirmed.
    type Diag = {
      __cashier_sa_count?: number;
      __cashier_sa_instances?: Set<unknown>;
      __cashier_signer_instances?: Set<unknown>;
    };
    const w = window as Window & Diag;
    w.__cashier_sa_count = (w.__cashier_sa_count ?? 0) + 1;
    w.__cashier_sa_instances = w.__cashier_sa_instances ?? new Set();
    w.__cashier_sa_instances.add(signerAgent);
    w.__cashier_signer_instances = w.__cashier_signer_instances ?? new Set();
    w.__cashier_signer_instances.add(signer);
    console.warn(
      `[SignerAgent diag] connect() #${w.__cashier_sa_count} — unique SignerAgent=${w.__cashier_sa_instances.size}, unique Signer=${w.__cashier_signer_instances.size}`,
    );

    return {
      owner: ownerText,
      subaccount: null,
    };
  }

  async isConnected(): Promise<boolean> {
    return this.iframeTransport !== null && this.principalText !== null;
  }

  async getPrincipal(): Promise<string> {
    if (!this.principalText) throw new Error("Not connected");
    return this.principalText;
  }

  // Actor creation is inherited from BaseSignerAdapter — passes signerAgent
  // directly to Actor.createActor, so every canister call traverses the wallet.

  // ── Cleanup ───────────────────────────────────────────────────────────

  protected async disconnectInternal(): Promise<void> {
    // Close ICRC-29 channel while the iframe is still alive so the wallet
    // receives the close message; tear down the iframe afterwards.
    await super.disconnectInternal();
    this.iframeTransport?.destroy();
    this.iframeTransport = null;
    this.principalText = null;
  }

  protected cleanupInternal(): void {
    super.cleanupInternal();
  }

  protected async onDispose(): Promise<void> {
    await super.onDispose();
  }

  // ── Private ───────────────────────────────────────────────────────────

  /**
   * Open the wallet as a popup, wait for the `wallet_auth_complete` message,
   * and return the authenticated principal string.
   *
   * The wallet +page.svelte auto-triggers II login when `window.opener` is set.
   * After successful II auth it posts `{ type: 'wallet_auth_complete', principal }`
   * and closes itself.
   *
   * @param derivationOrigin - if provided, appended as `?derivationOrigin=<value>` so
   *   the wallet passes it through to AuthClient.login, ensuring the same II principal
   *   as a direct DApp login.
   */
  private openLoginPopup(
    walletOrigin: string,
    derivationOrigin?: string
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const popupUrl = new URL(walletOrigin);
      if (derivationOrigin) {
        popupUrl.searchParams.set("derivationOrigin", derivationOrigin);
      }
      const popup = window.open(popupUrl.toString(), "_blank");
      if (!popup) {
        reject(
          new Error("CashierWalletSignerAdapter: login popup was blocked")
        );
        return;
      }

      const walletOriginUrl = new URL(walletOrigin).origin;

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== walletOriginUrl) return;
        if (event.data?.type !== "wallet_auth_complete") return;

        cleanup();
        const principal = (event.data.principal as string) ?? "";
        if (!principal) {
          reject(
            new Error(
              "CashierWalletSignerAdapter: wallet_auth_complete received without a principal"
            )
          );
        } else {
          resolve(principal);
        }
      };

      const closedCheck = setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(
            new Error(
              "CashierWalletSignerAdapter: login popup was closed before authentication completed"
            )
          );
        }
      }, POPUP_CLOSED_CHECK_MS);

      // Poll the popup with wallet_check_auth so the wallet can reply via
      // event.source even when window.opener is null (e.g. after a cross-origin
      // II redirect that clears the opener reference via COOP headers).
      // postMessage silently drops while the popup is at a different origin
      // (e.g. https://id.ai), so this is safe to run continuously.
      const authPollInterval = setInterval(() => {
        if (!popup.closed) {
          popup.postMessage({ type: "wallet_check_auth" }, walletOriginUrl);
        }
      }, POPUP_CLOSED_CHECK_MS);

      const timeoutHandle = setTimeout(() => {
        cleanup();
        reject(new Error("CashierWalletSignerAdapter: login timed out"));
      }, POPUP_TIMEOUT_MS);

      const cleanup = () => {
        clearInterval(closedCheck);
        clearInterval(authPollInterval);
        clearTimeout(timeoutHandle);
        window.removeEventListener("message", messageHandler);
      };

      window.addEventListener("message", messageHandler);
    });
  }
}
