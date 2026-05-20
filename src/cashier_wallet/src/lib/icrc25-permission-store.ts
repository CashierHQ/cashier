/**
 * BroadcastChannel bridge for ICRC-25 permission request prompts.
 *
 * The OISY Signer's `icrc25_request_permissions` prompt callback is `void`-
 * returning — `confirm()` is provided in the payload and must be called
 * externally (after user interaction). This store holds the OISY `confirm`
 * reference and calls it when the permission popup BroadcastChannel message
 * arrives.
 *
 * Flow:
 *   1. oisy-signer-init receives ICRC25_REQUEST_PERMISSIONS prompt
 *      → createPendingPermission(requestId, scopes, origin, confirm)
 *      → opens /icrc25-permissions?id=<requestId> popup
 *   2. Popup sends 'icrc25_get' → store responds with 'icrc25_data'
 *   3. User decides → popup sends 'icrc25_confirmed' with chosen scope states
 *   4. Store calls entry.oisyConfirm(scopes) → OISY proceeds
 */

export type IcrcScopedMethod = 'icrc27_accounts' | 'icrc49_call_canister'
export type IcrcPermissionState = 'granted' | 'denied' | 'ask_on_use'

export interface IcrcScope {
  scope: { method: IcrcScopedMethod }
  state: IcrcPermissionState
}

interface PendingPermission {
  requestedScopes: IcrcScope[]
  origin: string
  /** The OISY Signer's confirm callback — calling it grants/denies scopes */
  oisyConfirm: (scopes: IcrcScope[]) => void
}

/** Active pending permission requests keyed by requestId */
export const pendingPermissions = new Map<string, PendingPermission>()

/** Auto-expire pending requests after 5 minutes */
const PERMISSION_TTL_MS = 5 * 60 * 1_000

let _permissionChannel: BroadcastChannel | null = null

function getPermissionChannel(): BroadcastChannel {
  if (!_permissionChannel) {
    _permissionChannel = new BroadcastChannel('wallet-icrc25-permissions')
    _permissionChannel.onmessage = (event: MessageEvent) => {
      const { type, requestId } = (event.data ?? {}) as { type?: string; requestId?: string }
      if (!type || !requestId) return

      const entry = pendingPermissions.get(requestId)

      switch (type) {
        case 'icrc25_get': {
          if (entry) {
            _permissionChannel!.postMessage({
              type: 'icrc25_data',
              requestId,
              requestedScopes: entry.requestedScopes,
              origin: entry.origin,
            })
          }
          break
        }
        case 'icrc25_confirmed': {
          const scopes = (event.data as { scopes?: IcrcScope[] }).scopes ?? []
          if (entry) {
            entry.oisyConfirm(scopes)
            pendingPermissions.delete(requestId)
          }
          break
        }
      }
    }
  }
  return _permissionChannel
}

/**
 * Register a new pending ICRC-25 permission request.
 * The `oisyConfirm` callback is called when the user makes a decision in the popup,
 * or denied-by-default when the TTL expires.
 */
export function createPendingPermission(
  requestId: string,
  requestedScopes: IcrcScope[],
  origin: string,
  oisyConfirm: (scopes: IcrcScope[]) => void,
): void {
  getPermissionChannel() // ensure channel is listening before popup opens
  pendingPermissions.set(requestId, { requestedScopes, origin, oisyConfirm })

  // Auto-expire after TTL — deny all scopes if no response
  setTimeout(() => {
    const entry = pendingPermissions.get(requestId)
    if (entry) {
      const deniedScopes = entry.requestedScopes.map((s) => ({
        scope: s.scope,
        state: 'denied' as const,
      }))
      entry.oisyConfirm(deniedScopes)
      pendingPermissions.delete(requestId)
    }
  }, PERMISSION_TTL_MS)
}
