import type { Channel, Transport } from '@slide-computer/signer'
import { HeartbeatClient, PostMessageChannel } from '@slide-computer/signer-web'

export interface IframeTransportOptions {
  /**
   * Full origin URL of the wallet application.
   * @example 'https://wallet.cashierapp.io'
   */
  url: string
  /**
   * Time in milliseconds before the ICRC-29 channel establishment times out.
   * @default 30000
   */
  establishTimeout?: number
  /**
   * Time in milliseconds without a heartbeat before the channel is considered
   * disconnected.
   * @default 2000
   */
  disconnectTimeout?: number
  /**
   * Status polling rate in ms (matches HeartbeatClient default).
   * @default 300
   */
  statusPollingRate?: number
  /**
   * Container element to append the hidden iframe to.
   * @default document.body
   */
  container?: HTMLElement
}

export class IframeTransportError extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, IframeTransportError.prototype)
  }
}

/**
 * ICRC-29 transport that embeds the wallet as a hidden iframe and establishes
 * a JSON-RPC 2.0 channel via window.postMessage.
 *
 * Usage (DApp side):
 *   const transport = new IframeTransport({ url: 'https://wallet.example.com' })
 *   const signer = new Signer({ transport })
 *   const channel = await transport.establishChannel()   // mounts iframe + handshake
 */
export class IframeTransport implements Transport {
  private readonly options: Required<
    Omit<IframeTransportOptions, 'container'>
  > & { container?: HTMLElement }

  private iframe: HTMLIFrameElement | null = null

  constructor(options: IframeTransportOptions) {
    // Validate origin
    try {
      new URL(options.url)
    } catch {
      throw new IframeTransportError(`Invalid wallet URL: ${options.url}`)
    }

    this.options = {
      url: options.url,
      establishTimeout: options.establishTimeout ?? 30_000,
      disconnectTimeout: options.disconnectTimeout ?? 2_000,
      statusPollingRate: options.statusPollingRate ?? 300,
      container: options.container,
    }
  }

  /**
   * Mount a hidden wallet iframe (if not already mounted), wait for the
   * ICRC-29 heartbeat handshake, then return a PostMessageChannel.
   *
   * The same iframe instance is reused across multiple `establishChannel()`
   * calls for the lifetime of the transport.
   */
  async establishChannel(): Promise<Channel> {
    const signerWindow = await this.ensureIframe()
    const signerOrigin = new URL(this.options.url).origin

    return new Promise<Channel>((resolve, reject) => {
      let channel: PostMessageChannel | undefined

      new HeartbeatClient({
        signerWindow,
        establishTimeout: this.options.establishTimeout,
        disconnectTimeout: this.options.disconnectTimeout,
        statusPollingRate: this.options.statusPollingRate,
        onEstablish: (origin: string) => {
          channel = new PostMessageChannel({
            signerWindow,
            signerOrigin: origin || signerOrigin,
            // Disable focus management — the wallet is a hidden iframe
            manageFocus: false,
          })
          resolve(channel)
        },
        onEstablishTimeout: () => {
          reject(
            new IframeTransportError(
              'ICRC-29 channel could not be established within the timeout. ' +
                'Ensure the wallet is running and responding to icrc29_status.',
            ),
          )
        },
        onDisconnect: () => {
          // Channel disconnected — callers will receive an error on next send()
          channel?.close().catch(() => {})
        },
      })
    })
  }

  /**
   * Remove the hidden iframe from the DOM and clean up.
   * Call this when the PNP adapter disconnects.
   */
  destroy(): void {
    this.iframe?.remove()
    this.iframe = null
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /** Create (or reuse) the hidden iframe and wait for it to load. */
  private ensureIframe(): Promise<Window> {
    if (this.iframe?.contentWindow) {
      return Promise.resolve(this.iframe.contentWindow)
    }

    return new Promise<Window>((resolve, reject) => {
      const iframe = document.createElement('iframe')
      iframe.src = this.options.url
      // Hidden but still active — display:none suppresses message events in
      // some older browsers, so we use size/visibility instead.
      iframe.style.cssText =
        'position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;' +
        'border:0;opacity:0;pointer-events:none;'
      iframe.title = 'Cashier Wallet bridge'
      // Allow the iframe to open consent popups for ICRC-49 consent flow
      iframe.allow = 'popups; popups-to-escape-sandbox'

      iframe.addEventListener(
        'load',
        () => {
          if (!iframe.contentWindow) {
            reject(new IframeTransportError('iframe contentWindow not available'))
            return
          }
          this.iframe = iframe
          resolve(iframe.contentWindow)
        },
        { once: true },
      )

      const container = this.options.container ?? document.body
      container.appendChild(iframe)
    })
  }
}
