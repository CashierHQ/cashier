import { RpcClient } from "./RpcClient";
import {
  UserRejectedError,
  NotConnectedError,
  ConsentTimeoutError,
} from "./errors";

const POPUP_CLOSED_CHECK_MS = 500;
import type {
  WalletSDKConfig,
  WalletSDKEvents,
  AuthState,
  SignResult,
  TransferParams,
  TransferResult,
} from "./types";

type EventListener<T> = (data: T) => void;
type AnyListener = EventListener<unknown>;

/** Default wallet origin for local development. Update to production URL before publishing. */
const DEFAULT_WALLET_ORIGIN = "http://localhost:5177";

const CONSENT_BYPASS = new Set([
  "ping",
  "connect",
  "is_authenticated",
  "get_principal_internal",
]);
const HANDSHAKE_RETRIES = 5;
const HANDSHAKE_TIMEOUT_MS = 1_000;

/**
 * Framework-agnostic wallet SDK.
 *
 * Mounts a hidden iframe at walletOrigin for fast non-interactive RPCs,
 * and opens a popup for anything that requires user consent.
 *
 * Usage:
 *   const sdk = new WalletSDK({ walletOrigin: 'https://wallet.example.com' })
 *   await sdk.mount(document.body)
 *   await sdk.login()
 *   const { blockIndex } = await sdk.icrc1Transfer({ ... })
 */
export class WalletSDK {
  private readonly walletOrigin: string;
  private client: RpcClient | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private connected = false;
  private loginListener: ((e: MessageEvent) => void) | null = null;
  private readonly eventListeners = new Map<string, Set<AnyListener>>();

  constructor(config: WalletSDKConfig = {}) {
    this.walletOrigin = config.walletOrigin ?? DEFAULT_WALLET_ORIGIN;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Create and mount a hidden wallet iframe, run the ICRC-29 handshake,
   * and check if a session is already active.
   * Resolves once the handshake succeeds; rejects on failure.
   */
  async mount(container: HTMLElement): Promise<void> {
    if (this.iframe) return;

    this.client = new RpcClient(this.walletOrigin);

    this.iframe = document.createElement("iframe");
    this.iframe.src = this.walletOrigin;
    this.iframe.style.cssText =
      "position:absolute;width:0;height:0;border:0;visibility:hidden;";
    this.iframe.title = "Wallet bridge";

    await new Promise<void>((resolve, reject) => {
      this.iframe!.addEventListener("load", async () => {
        if (!this.iframe?.contentWindow) {
          reject(new Error("iframe contentWindow not available"));
          return;
        }

        this.client!.connect(this.iframe.contentWindow);

        for (let i = 0; i < HANDSHAKE_RETRIES; i++) {
          try {
            await this.client!.request(
              "connect",
              undefined,
              HANDSHAKE_TIMEOUT_MS,
            );
            this.connected = true;
            this.emit("connected", undefined);
            console.debug("[WalletSDK] handshake ok");
            await this._refreshAuth();
            resolve();
            return;
          } catch {
            if (i < HANDSHAKE_RETRIES - 1) {
              console.debug(
                `[WalletSDK] handshake attempt ${i + 1} failed, retrying…`,
              );
            }
          }
        }
        reject(new Error("WalletSDK: handshake failed after retries"));
      });

      container.appendChild(this.iframe!);
    });
  }

  /** Remove the iframe and tear down all listeners. */
  unmount(): void {
    if (this.loginListener) {
      window.removeEventListener("message", this.loginListener);
      this.loginListener = null;
    }
    this.client?.destroy();
    this.client = null;
    this.iframe?.remove();
    this.iframe = null;
    this.connected = false;
    this.emit("disconnected", undefined);
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────

  /**
   * Open a popup pointing to the wallet for Internet Identity login.
   * Resolves with the user's principal once login completes.
   */
  async login(): Promise<{ principal: string }> {
    const tab = window.open(this.walletOrigin, "_blank");
    if (!tab) {
      throw new Error("WalletSDK: login popup was blocked");
    }

    // Capture the principal directly from the wallet_auth_complete message.
    // We do NOT call _refreshAuth() here because that requires the wallet
    // iframe to read back from IndexedDB — a round-trip that can race with
    // the popup closing (the popup may tear down its JS context before the
    // IndexedDB transaction fully commits). The principal in the message is
    // authoritative: it came from our wallet origin after a successful II
    // authentication.
    const principal = await new Promise<string>((resolve, reject) => {
      if (this.loginListener) {
        window.removeEventListener("message", this.loginListener);
      }

      this.loginListener = (event: MessageEvent) => {
        if (event.origin !== this.walletOrigin) return;
        if (event.data?.type !== "wallet_auth_complete") return;

        clearInterval(closedCheck);
        window.removeEventListener("message", this.loginListener!);
        this.loginListener = null;
        resolve((event.data.principal as string) ?? "");
      };

      window.addEventListener("message", this.loginListener);

      // Detect tab/popup closed by the user before completing auth
      const closedCheck = setInterval(() => {
        if (tab.closed) {
          clearInterval(closedCheck);
          window.removeEventListener("message", this.loginListener!);
          this.loginListener = null;
          reject(new UserRejectedError());
        }
      }, POPUP_CLOSED_CHECK_MS);
    });

    this.emit("authChange", { authenticated: true, principal });
    return { principal };
  }

  /** Check whether the wallet has an active Internet Identity session. */
  async isAuthenticated(): Promise<boolean> {
    this._assertConnected();
    const res = (await this.client!.request("is_authenticated")) as {
      authenticated: boolean;
    };
    return res.authenticated;
  }

  /** Logout and clear the wallet session. */
  async logout(): Promise<void> {
    this._assertConnected();
    await this.client!.request("logout");
    this.emit("authChange", { authenticated: false, principal: "" });
  }

  // ─── Wallet methods ─────────────────────────────────────────────────────────

  /** Returns the authenticated principal. Requires consent. */
  async getPrincipal(): Promise<string> {
    const res = (await this._requestWithConsent("get_principal")) as {
      principal: string;
    };
    return res.principal;
  }

  /**
   * Sign an arbitrary UTF-8 message with the delegated identity.
   * Requires consent — opens the wallet consent popup before executing.
   * @param message - UTF-8 string to sign.
   * @returns `SignResult` containing the hex-encoded signature and the signer's principal.
   */
  async signMessage(message: string): Promise<SignResult> {
    const res = (await this._requestWithConsent("sign_message", {
      message,
    })) as SignResult;
    return res;
  }

  /**
   * Query the ICRC-1 token balance for an account.
   * Requires consent — opens the wallet consent popup before executing.
   * @param canisterId - Textual canister ID of the ICRC-1 token ledger.
   * @param owner - Principal text of the account owner; defaults to the authenticated principal.
   * @returns Token balance in the smallest unit (e.g. e8s for ICP).
   */
  async icrc1BalanceOf(canisterId: string, owner?: string): Promise<bigint> {
    const res = (await this._requestWithConsent("icrc1_balance_of", {
      canisterId,
      owner,
    })) as { balance: string };
    return BigInt(res.balance);
  }

  /**
   * Execute an ICRC-1 token transfer.
   * Requires consent — opens the wallet consent popup before executing.
   * @param params - Transfer details including canister ID, recipient, and amount.
   * @returns `TransferResult` containing the ledger block index of the accepted transfer.
   */
  async icrc1Transfer(params: TransferParams): Promise<TransferResult> {
    const rpcParams = { ...params, amount: params.amount.toString() };
    const res = (await this._requestWithConsent(
      "icrc1_transfer",
      rpcParams,
    )) as { blockIndex: string };
    return { blockIndex: BigInt(res.blockIndex) };
  }

  /** Health check — no consent required. */
  async ping(): Promise<string> {
    this._assertConnected();
    return this.client!.request("ping") as Promise<string>;
  }

  // ─── Events ─────────────────────────────────────────────────────────────────

  on<K extends keyof WalletSDKEvents>(
    event: K,
    listener: EventListener<WalletSDKEvents[K]>,
  ): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as AnyListener);
    return this;
  }

  off<K extends keyof WalletSDKEvents>(
    event: K,
    listener: EventListener<WalletSDKEvents[K]>,
  ): this {
    this.eventListeners.get(event)?.delete(listener as AnyListener);
    return this;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _assertConnected(): void {
    if (!this.connected || !this.client) {
      throw new NotConnectedError();
    }
  }

  /**
   * Refresh auth state from the wallet iframe and emit authChange.
   * Uses `get_principal_internal` (consent-bypassed) to avoid circular consent
   * loops on mount/login. The public `getPrincipal()` method enforces consent.
   */
  private async _refreshAuth(): Promise<{ principal: string }> {
    this._assertConnected();
    const authRes = (await this.client!.request("is_authenticated")) as {
      authenticated: boolean;
    };

    if (authRes.authenticated) {
      const idRes = (await this.client!.request("get_principal_internal")) as {
        principal: string;
      };
      const state: AuthState = {
        authenticated: true,
        principal: idRes.principal,
      };
      this.emit("authChange", state);
      return { principal: idRes.principal };
    }

    this.emit("authChange", { authenticated: false, principal: "" });
    return { principal: "" };
  }

  /**
   * Execute a wallet RPC through the two-phase consent flow.
   *  1. Register the pending operation with the wallet iframe (`consent_prepare`).
   *  2. Open the wallet `/consent` popup and await user approval via postMessage.
   *  3. Execute the actual RPC, passing the approved `consentId` in params.
   * @param method - RPC method name to invoke after consent is granted.
   * @param params - Optional parameters forwarded to the wallet method.
   * @returns The raw result returned by the wallet RPC.
   * @throws {UserRejectedError} When the user rejects in the consent popup.
   * @throws {ConsentTimeoutError} When the consent popup is closed without a decision.
   */
  private async _requestWithConsent(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<unknown> {
    this._assertConnected();

    if (CONSENT_BYPASS.has(method)) {
      return this.client!.request(method, params);
    }

    const consentId = crypto.randomUUID();

    // Phase 1: tell the wallet about the pending operation
    await this.client!.request("consent_prepare", {
      method,
      params,
      consentId,
    });

    // Phase 2: open consent popup and wait for user decision
    await this._openConsentPopup(consentId);

    // Phase 3: execute the actual method with the approved consentId
    return this.client!.request(method, { ...(params ?? {}), consentId });
  }

  /**
   * Open the wallet /consent page as a popup and return a promise that
   * resolves on approval or rejects on rejection / popup closure.
   */
  private _openConsentPopup(consentId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = `${this.walletOrigin}/consent?id=${consentId}`;
      const popup = window.open(
        url,
        `wallet_consent_${consentId}`,
        "width=460,height=520,scrollbars=no,resizable=no,noopener=no",
      );

      if (!popup) {
        reject(new Error("WalletSDK: consent popup was blocked"));
        return;
      }

      const listener = (event: MessageEvent) => {
        if (event.origin !== this.walletOrigin) return;

        const { type, consentId: cid } = event.data ?? {};
        if (cid !== consentId) return;

        window.removeEventListener("message", listener);
        clearInterval(closedCheck);

        if (type === "consent_approved") {
          resolve();
        } else if (type === "consent_rejected") {
          reject(new UserRejectedError());
        }
      };

      window.addEventListener("message", listener);

      // Detect popup closed without a decision (user closed window manually)
      const closedCheck = setInterval(() => {
        if (popup.closed) {
          clearInterval(closedCheck);
          window.removeEventListener("message", listener);
          reject(new ConsentTimeoutError());
        }
      }, 500);
    });
  }

  private emit<K extends keyof WalletSDKEvents>(
    event: K,
    data: WalletSDKEvents[K],
  ): void {
    this.eventListeners
      .get(event)
      ?.forEach((fn) => (fn as EventListener<WalletSDKEvents[K]>)(data));
  }
}
