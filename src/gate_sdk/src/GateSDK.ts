import type { GateSDKConfig, ConnectXResult, GateMessage } from './types'
import {
  UserCancelledError,
  ConnectionTimeoutError,
  AuthFailedError,
  PopupBlockedError,
} from './errors'

const DEFAULT_POPUP_CHECK_INTERVAL_MS = 500
const DEFAULT_TIMEOUT_MS = 300_000

export class GateSDK {
  private readonly gateOrigin: string
  private readonly popupCheckIntervalMs: number
  private readonly timeoutMs: number

  constructor(config: GateSDKConfig) {
    this.gateOrigin = config.gateOrigin
    this.popupCheckIntervalMs = config.popupCheckIntervalMs ?? DEFAULT_POPUP_CHECK_INTERVAL_MS
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  /**
   * Open the Gate FE connect popup and wait for the user to authorize their X account.
   *
   * Resolves with `{ profile, accessToken }` on success.
   * Rejects with one of: `UserCancelledError`, `ConnectionTimeoutError`,
   * `AuthFailedError`, or `PopupBlockedError`.
   */
  connectX(): Promise<ConnectXResult> {
    const popup = window.open(
      `${this.gateOrigin}/connect`,
      'gate_x_connect',
      'popup,width=600,height=700',
    )

    if (!popup) {
      return Promise.reject(new PopupBlockedError())
    }

    return new Promise<ConnectXResult>((resolve, reject) => {
      let settled = false
      let closedCheckTimer: ReturnType<typeof setInterval>
      let timeoutTimer: ReturnType<typeof setTimeout>

      const cleanup = () => {
        window.removeEventListener('message', handleMessage)
        clearInterval(closedCheckTimer)
        clearTimeout(timeoutTimer)
      }

      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        cleanup()
        fn()
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== this.gateOrigin) return
        const msg = event.data as GateMessage

        if (msg?.type === 'gate_x_auth_complete') {
          settle(() => resolve({ profile: msg.profile, accessToken: msg.accessToken }))
        } else if (msg?.type === 'gate_x_auth_error') {
          settle(() => reject(new AuthFailedError(msg.error)))
        }
      }

      window.addEventListener('message', handleMessage)

      closedCheckTimer = setInterval(() => {
        if (popup.closed) {
          settle(() => reject(new UserCancelledError()))
        }
      }, this.popupCheckIntervalMs)

      timeoutTimer = setTimeout(() => {
        settle(() => reject(new ConnectionTimeoutError()))
      }, this.timeoutMs)
    })
  }
}
