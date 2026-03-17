import type { ActorSubclass } from '@dfinity/agent'
import { HttpAgent } from '@dfinity/agent'
import { BaseSignerAdapter } from '@windoge98/plug-n-play'
import type { AdapterConstructorArgs } from '@windoge98/plug-n-play'
import { Signer } from '@slide-computer/signer'
import type { Transport } from '@slide-computer/signer'
import { SignerAgent } from '@slide-computer/signer-agent'
import { IframeTransport } from './IframeTransport'

// ── Config ────────────────────────────────────────────────────────────────

export interface CashierWalletAdapterConfig {
  /**
   * Full origin URL of the Cashier Wallet app.
   * @example 'https://wallet.cashierapp.io'
   * @example 'http://localhost:5177'
   */
  walletOrigin: string
  /**
   * Optional ICP replica host for the SignerAgent.
   * For local development pass `'http://localhost:8000'`.
   * @default 'https://icp-api.io'
   */
  host?: string
  /**
   * ICRC-29 channel establishment timeout in ms.
   * @default 30000
   */
  establishTimeout?: number
}

// ── Adapter ───────────────────────────────────────────────────────────────

interface Account {
  owner: string | null
  subaccount: string | null
}

const POPUP_CLOSED_CHECK_MS = 500
const POPUP_TIMEOUT_MS = 5 * 60 * 1_000 // 5 min

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
  private iframeTransport: IframeTransport | null = null
  private principalText: string | null = null

  constructor(args: AdapterConstructorArgs<CashierWalletAdapterConfig>) {
    if (
      typeof args.config !== 'object' ||
      args.config === null ||
      !('walletOrigin' in args.config) ||
      typeof (args.config as CashierWalletAdapterConfig).walletOrigin !== 'string'
    ) {
      throw new Error('CashierWalletSignerAdapter: invalid config — walletOrigin is required')
    }
    super(args)
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
    const { walletOrigin, host = 'https://icp-api.io', establishTimeout = 30_000 } = this.config

    // Phase 1 — II login via popup
    const principal = await this.openLoginPopup(walletOrigin)
    this.principalText = principal

    // Phase 2 — mount iframe + ICRC-29 transport
    this.iframeTransport = new IframeTransport({ url: walletOrigin, establishTimeout })
    // Cast to Transport to avoid private-field variance issues across signer-js versions
    this.signer = new Signer({
      transport: this.iframeTransport as unknown as Transport,
      // Keep the channel alive across calls (we re-use the iframe)
      autoCloseTransportChannel: false,
    })

    // Phase 3 — request permissions
    await this.signer.requestPermissions([
      { method: 'icrc27_accounts' },
      { method: 'icrc49_call_canister' },
    ])

    // Phase 4 — verify accounts
    const accounts = await this.signer.accounts()
    const ownerPrincipal = accounts[0]?.owner
    const ownerText = ownerPrincipal ? ownerPrincipal.toText() : principal

    // Phase 5 — create SignerAgent for actor creation (routes calls via ICRC-49)
    this.signerAgent = SignerAgent.createSync({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signer: this.signer as unknown as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      account: ownerPrincipal! as unknown as any,
      agent: HttpAgent.createSync({ host }),
    })
    this.agent = this.signerAgent as unknown as HttpAgent

    return {
      owner: ownerText,
      subaccount: null,
    }
  }

  async isConnected(): Promise<boolean> {
    return this.iframeTransport !== null && this.principalText !== null
  }

  async getPrincipal(): Promise<string> {
    if (!this.principalText) throw new Error('Not connected')
    return this.principalText
  }

  // ── Actor creation ────────────────────────────────────────────────────

  protected createActorInternal<T>(
    canisterId: string,
    idl: Record<string, unknown>,
  ): ActorSubclass<T> {
    if (!this.signerAgent) {
      throw new Error('CashierWalletSignerAdapter: not connected — call connect() first')
    }
    return this.createActorWithAgent<T>(
      this.signerAgent as unknown as HttpAgent,
      canisterId,
      idl,
    )
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  protected async disconnectInternal(): Promise<void> {
    this.iframeTransport?.destroy()
    this.iframeTransport = null
    this.principalText = null
  }

  protected cleanupInternal(): void {
    this.iframeTransport?.destroy()
    this.iframeTransport = null
    this.principalText = null
    this.agent = null
    this.signerAgent = null
  }

  protected async onDispose(): Promise<void> {
    this.cleanupInternal()
  }

  // ── Private ───────────────────────────────────────────────────────────

  /**
   * Open the wallet as a popup, wait for the `wallet_auth_complete` message,
   * and return the authenticated principal string.
   *
   * The wallet +page.svelte auto-triggers II login when `window.opener` is set.
   * After successful II auth it posts `{ type: 'wallet_auth_complete', principal }`
   * and closes itself.
   */
  private openLoginPopup(walletOrigin: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const popup = window.open(walletOrigin, '_blank')
      if (!popup) {
        reject(new Error('CashierWalletSignerAdapter: login popup was blocked'))
        return
      }

      const walletOriginUrl = new URL(walletOrigin).origin

      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== walletOriginUrl) return
        if (event.data?.type !== 'wallet_auth_complete') return

        cleanup()
        const principal = (event.data.principal as string) ?? ''
        if (!principal) {
          reject(new Error('CashierWalletSignerAdapter: wallet_auth_complete received without a principal'))
        } else {
          resolve(principal)
        }
      }

      const closedCheck = setInterval(() => {
        if (popup.closed) {
          cleanup()
          reject(new Error('CashierWalletSignerAdapter: login popup was closed before authentication completed'))
        }
      }, POPUP_CLOSED_CHECK_MS)

      // Poll the popup with wallet_check_auth so the wallet can reply via
      // event.source even when window.opener is null (e.g. after a cross-origin
      // II redirect that clears the opener reference via COOP headers).
      // postMessage silently drops while the popup is at a different origin
      // (e.g. https://id.ai), so this is safe to run continuously.
      const authPollInterval = setInterval(() => {
        if (!popup.closed) {
          popup.postMessage({ type: 'wallet_check_auth' }, walletOriginUrl)
        }
      }, POPUP_CLOSED_CHECK_MS)

      const timeoutHandle = setTimeout(() => {
        cleanup()
        reject(new Error('CashierWalletSignerAdapter: login timed out'))
      }, POPUP_TIMEOUT_MS)

      const cleanup = () => {
        clearInterval(closedCheck)
        clearInterval(authPollInterval)
        clearTimeout(timeoutHandle)
        window.removeEventListener('message', messageHandler)
      }

      window.addEventListener('message', messageHandler)
    })
  }
}
