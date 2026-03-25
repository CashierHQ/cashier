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
  /**
   * ICRC-29 heartbeat disconnect timeout in ms.
   * Must exceed the longest expected IC update call (~10 s on mainnet).
   * @default 30000
   */
  disconnectTimeout?: number
  /**
   * Internet Identity derivation origin.
   * Set this to the DApp's origin so that the wallet derives the same
   * principal as a direct II login from the DApp.
   * @example 'https://cashierapp.io'
   * @example 'http://localhost:3000'
   */
  derivationOrigin?: string
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
    const {
      walletOrigin,
      host = 'https://icp-api.io',
      establishTimeout = 30_000,
      disconnectTimeout = 30_000,
      derivationOrigin,
    } = this.config

    // Phase 1 — II login via popup (pass derivationOrigin so wallet uses same II principal)
    console.log(`[cashier-sdk-adapter] Opening II login popup → ${walletOrigin}`)
    const principal = await this.openLoginPopup(walletOrigin, derivationOrigin)
    this.principalText = principal
    console.log(`[cashier-sdk-adapter] Login complete — principal: ${principal}`)

    // Phase 2 — mount iframe + ICRC-29 transport
    console.log('[cashier-sdk-adapter] Mounting wallet iframe and establishing ICRC-29 channel...')
    this.iframeTransport = new IframeTransport({ url: walletOrigin, establishTimeout, disconnectTimeout })
    // Cast to Transport to avoid private-field variance issues across signer-js versions
    this.signer = new Signer({
      transport: this.iframeTransport as unknown as Transport,
      // Keep the channel alive across calls (we re-use the iframe)
      autoCloseTransportChannel: false,
    })
    console.log('[cashier-sdk-adapter] ICRC-29 channel established')

    // Phase 3 — request permissions (shows ICRC-25 permission prompt in wallet)
    console.log('[cashier-sdk-adapter] Requesting permissions (icrc27_accounts, icrc49_call_canister)...')
    try {
      await this.signer.requestPermissions([
        { method: 'icrc27_accounts' },
        { method: 'icrc49_call_canister' },
      ])
    } catch (e: unknown) {
      // ICRC-25 error code 3001 (ACTION_ABORTED) means user denied permissions
      const code = (e as { code?: number })?.code
      if (code === 3001 || String(e).toLowerCase().includes('abort') || String(e).toLowerCase().includes('denied')) {
        throw new Error('User denied wallet permissions')
      }
      throw e
    }
    console.log('[cashier-sdk-adapter] Permissions granted')

    // Phase 4 — verify accounts
    console.log('[cashier-sdk-adapter] Fetching accounts from wallet...')
    const accounts = await this.signer.accounts()
    const ownerPrincipal = accounts[0]?.owner
    const ownerText = ownerPrincipal ? ownerPrincipal.toText() : principal
    console.log(`[cashier-sdk-adapter] Connected — owner: ${ownerText}`)

    // Phase 5 — create SignerAgent for update calls (ICRC-49 via iframe wallet)
    this.signerAgent = SignerAgent.createSync({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signer: this.signer as unknown as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      account: ownerPrincipal! as unknown as any,
      agent: HttpAgent.createSync({ host }),
    })

    // Hybrid agent: query/readState calls bypass ICRC-49 and go directly to the IC
    // replica as anonymous requests. This avoids the ~5-10 s update-call overhead
    // for read operations (e.g. icrc1_balance_of) which pass the account as an
    // argument and therefore do not require the wallet's signing identity.
    // Write/update calls (agent.call) still route through SignerAgent → ICRC-49.
    const queryAgent = HttpAgent.createSync({ host })
    const signerAgentRef = this.signerAgent
    this.agent = new Proxy(signerAgentRef, {
      get(target: unknown, prop: string | symbol) {
        if (prop === 'query') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fn = (queryAgent as any)[prop]
          return typeof fn === 'function' ? fn.bind(queryAgent) : fn
        }
        if (prop === 'readState') {
          return async (
            canisterId: unknown,
            options: { paths?: unknown[] },
            ...rest: unknown[]
          ) => {
            const paths = options?.paths
            const isRequestStatus =
              Array.isArray(paths) &&
              paths.length === 1 &&
              Array.isArray(paths[0]) &&
              paths[0].length === 2 &&
              (paths[0][0] instanceof ArrayBuffer ||
                paths[0][0] instanceof Uint8Array) &&
              new TextDecoder().decode(paths[0][0]) === 'request_status'
            if (isRequestStatus) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (signerAgentRef as any).readState(canisterId, options, ...rest)
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (queryAgent as any).readState(canisterId, options, ...rest)
          }
        }
        if (prop === 'call') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (...args: unknown[]) => {
            console.log('[cashier-sdk-adapter] Update call → routing via ICRC-49 to wallet iframe')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (signerAgentRef as any).call(...args)
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (target as any)[prop]
        return typeof value === 'function' ? value.bind(target) : value
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as unknown as HttpAgent

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
    if (!this.agent) {
      throw new Error('CashierWalletSignerAdapter: not connected — call connect() first')
    }
    // Use the hybrid agent so query methods go directly to the IC replica
    // (fast) while update methods still route through SignerAgent → ICRC-49.
    return this.createActorWithAgent<T>(
      this.agent as unknown as HttpAgent,
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
   *
   * @param derivationOrigin - if provided, appended as `?derivationOrigin=<value>` so
   *   the wallet passes it through to AuthClient.login, ensuring the same II principal
   *   as a direct DApp login.
   */
  private openLoginPopup(walletOrigin: string, derivationOrigin?: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const popupUrl = new URL(walletOrigin)
      if (derivationOrigin) {
        popupUrl.searchParams.set('derivationOrigin', derivationOrigin)
      }
      const popup = window.open(popupUrl.toString(), '_blank')
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
