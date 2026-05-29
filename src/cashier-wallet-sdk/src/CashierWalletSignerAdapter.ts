import { HttpAgent } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
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
const SILENT_RECONNECT_TIMEOUT_MS = 5_000;

/**
 * Race a promise against a timeout. The losing branch's errors are swallowed
 * so we don't leak unhandled rejections when the silent attempt is abandoned.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`silent-reconnect: timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    /* SSR-safe / quota errors swallowed */
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    /* SSR-safe */
  }
}

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
   * Connection flow with silent reconnect:
   *
   *  1. Mount iframe + Signer silently (no popup, no user gesture).
   *  2. Attempt silent reconnect: requestPermissions + getAccounts within a
   *     short timeout. OISY auto-returns when grants are persisted in the
   *     wallet origin's localStorage and the II session is still valid.
   *  3. On silent success → finalize (persist principal, init SignerAgent).
   *  4. On silent failure/timeout → tear down silent attempt, open login
   *     popup, then re-mount and request permissions before finalizing.
   *
   * Net effect: page refreshes don't re-prompt while the wallet session and
   * ICRC-25 grants are still valid.
   */
  async connect(): Promise<Account> {
    const {
      walletOrigin,
      host = "https://icp-api.io",
      establishTimeout = 120_000,
      disconnectTimeout = 120_000,
    } = this.config;

    // ── Silent attempt ────────────────────────────────────────────────────
    this.mountTransportAndSigner(
      walletOrigin,
      establishTimeout,
      disconnectTimeout,
    );
    const silent = await this.attemptSilentReconnect(
      SILENT_RECONNECT_TIMEOUT_MS,
    );
    if (silent) {
      return this.finalizeConnection(
        host,
        silent.principal,
        silent.ownerPrincipal,
      );
    }

    // ── Popup fallback ────────────────────────────────────────────────────
    // Tear down the failed silent attempt before opening the popup so the
    // user-gesture path mounts a fresh iframe + ICRC-29 channel.
    this.tearDownTransportAndSigner();

    // NOTE: `config.derivationOrigin` is intentionally NOT forwarded here.
    // ICRC-95 derivation-origin support is deferred (see plan unresolved Q#1).
    const principal = await this.openLoginPopup(walletOrigin);

    this.mountTransportAndSigner(
      walletOrigin,
      establishTimeout,
      disconnectTimeout,
    );

    try {
      await this.signer!.requestPermissions([
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

    const accounts = await this.signer!.getAccounts();
    const ownerPrincipal = accounts[0]?.owner;
    return this.finalizeConnection(host, principal, ownerPrincipal);
  }

  /**
   * Mount the hidden iframe and instantiate a Signer over the resulting
   * ICRC-29 channel. Called twice in the popup-fallback path: once for the
   * silent attempt, again after the user authenticates.
   */
  private mountTransportAndSigner(
    walletOrigin: string,
    establishTimeout: number,
    disconnectTimeout: number,
  ): void {
    this.iframeTransport = new IframeTransport({
      url: walletOrigin,
      establishTimeout,
      disconnectTimeout,
    });
    this.signer = new Signer<Transport>({
      transport: this.iframeTransport,
      // Keep the channel alive across calls (we re-use the iframe)
      autoCloseTransportChannel: false,
    });
  }

  /**
   * Reverse of `mountTransportAndSigner` — destroys the iframe and clears
   * the Signer reference. Used when the silent attempt fails so the popup
   * fallback can mount a clean channel.
   */
  private tearDownTransportAndSigner(): void {
    this.iframeTransport?.destroy();
    this.iframeTransport = null;
    this.signer = null;
  }

  /**
   * Attempt to rehydrate the session without any user-visible prompt.
   * Succeeds only when the wallet origin already has ICRC-25 grants for our
   * scopes AND a non-anonymous II session is active.
   *
   * Note: each of the two awaited calls has its own `timeoutMs` budget,
   * so the worst-case silent window is ~2 * timeoutMs. In practice both
   * calls return near-instantly when the wallet is in the happy state, so
   * the simple per-call budget is good enough.
   */
  private async attemptSilentReconnect(
    timeoutMs: number,
  ): Promise<{ principal: string; ownerPrincipal: Principal | undefined } | null> {
    if (!this.signer) {
      console.warn("[silent-reconnect] no signer (mountTransportAndSigner failed)");
      return null;
    }
    const signer = this.signer;
    try {
      console.warn("[silent-reconnect] requesting permissions...");
      await withTimeout(
        signer.requestPermissions([
          { method: "icrc27_accounts" },
          { method: "icrc49_call_canister" },
        ]),
        timeoutMs,
      );
      console.warn("[silent-reconnect] permissions ok, fetching accounts...");
      const accounts = await withTimeout(signer.getAccounts(), timeoutMs);
      const ownerPrincipal = accounts[0]?.owner;
      console.warn(
        `[silent-reconnect] accounts=${accounts.length}, owner=${ownerPrincipal?.toText()}, anonymous=${ownerPrincipal?.isAnonymous()}`,
      );
      // Anonymous principals indicate the wallet's II session expired but
      // ICRC-25 grants are still stored. Treat as silent failure → popup.
      if (!ownerPrincipal || ownerPrincipal.isAnonymous()) {
        console.warn("[silent-reconnect] FAIL: no owner or anonymous");
        return null;
      }
      console.warn("[silent-reconnect] SUCCESS");
      return { principal: ownerPrincipal.toText(), ownerPrincipal };
    } catch (e) {
      console.warn("[silent-reconnect] FAIL:", e);
      return null;
    }
  }

  /**
   * Common tail of both silent and popup paths: persist the authenticated
   * principal, wire up the SignerAgent, and return the Account expected by
   * PNP. The parent's `principalStorageKey` is computed in the
   * BaseSignerAdapter ctor as `${adapter.id}_principal`.
   */
  private finalizeConnection(
    host: string,
    principal: string,
    ownerPrincipal: Principal | undefined,
  ): Account {
    if (!ownerPrincipal) {
      throw new Error(
        "CashierWalletSignerAdapter: no owner principal returned by the wallet",
      );
    }
    this.principalText = principal;
    safeLocalStorageSet(this.principalStorageKey, principal);

    const signerAgent = SignerAgent.createSync({
      signer: this.signer!,
      account: ownerPrincipal,
      agent: HttpAgent.createSync({ host }),
    });
    this.signerAgent = signerAgent;
    // Mirror onto `this.agent` so parent BaseSignerAdapter.isConnected() and
    // any contract-level consumers see a non-null agent.
    this.agent = signerAgent;

    return { owner: principal, subaccount: null };
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
    // Defense in depth: parent already clears its own principalStorageKey,
    // but be explicit so a partial parent failure can't leave residue.
    safeLocalStorageRemove(this.principalStorageKey);

    // Tell the wallet to clear its II delegation + our origin's ICRC-25
    // grants BEFORE we kill the iframe. Best-effort with a 1s timeout —
    // if the wallet is unresponsive we still proceed with teardown.
    await this.iframeTransport?.requestWalletLogout().catch(() => {});

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
