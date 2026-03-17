/**
 * Shared module for consent state and inter-window communication.
 *
 * Both the hidden iframe (rpc-handler.ts) and the consent popup page
 * are on the same wallet origin, so they share a BroadcastChannel.
 *
 * Flow:
 *   1. rpc-handler receives `consent_prepare` → calls createPendingConsent()
 *   2. Consent popup opens → sends 'consent_get' via BroadcastChannel
 *   3. This module responds with 'consent_data'
 *   4. User approves/rejects → popup sends 'consent_approved' / 'consent_rejected'
 *   5. This module resolves/rejects the stored Promise
 *   6. rpc-handler awaits that Promise before executing the sensitive method
 */

export interface PendingConsent {
  method: string
  params: unknown
  /** Origin of the DApp that initiated this request, shown to the user in the consent popup */
  dappOrigin: string
  /** Resolves when the user approves in the consent popup */
  approvalPromise: Promise<void>
  /** Internal — called by BroadcastChannel handler on approval */
  _approve: () => void
  /** Internal — called by BroadcastChannel handler on rejection */
  _reject: (reason: string) => void
}

/** Active pending consents keyed by consentId */
export const pendingConsents = new Map<string, PendingConsent>()

/** Auto-expire pending consents after this duration to prevent map leaks. */
const CONSENT_TTL_MS = 5 * 60 * 1_000

/** BroadcastChannel shared between the hidden iframe and the consent popup */
export const consentChannel = new BroadcastChannel('wallet-consent')

consentChannel.onmessage = (event: MessageEvent) => {
  const { type, consentId } = (event.data ?? {}) as { type?: string; consentId?: string }
  if (!type || !consentId) return

  const consent = pendingConsents.get(consentId)

  switch (type) {
    case 'consent_get': {
      // Popup is asking for the operation details so it can render the UI
      if (consent) {
        consentChannel.postMessage({
          type: 'consent_data',
          consentId,
          method: consent.method,
          params: consent.params,
          dappOrigin: consent.dappOrigin
        })
      }
      break
    }
    case 'consent_approved': {
      if (consent) {
        consent._approve()
        // Do not delete here — rpc-handler needs the entry when Phase 3 RPC arrives
      }
      break
    }
    case 'consent_rejected': {
      if (consent) {
        consent._reject('User rejected the request')
        // Do not delete here — rpc-handler cleans up after the awaited promise rejects
      }
      break
    }
  }
}

/**
 * Register a new pending consent.
 * The returned Promise resolves when the user approves in the consent popup,
 * or rejects when the user rejects.
 */
export function createPendingConsent(
  consentId: string,
  method: string,
  params: unknown,
  dappOrigin: string
): void {
  let _approve!: () => void
  let _reject!: (reason: string) => void

  const approvalPromise = new Promise<void>((resolve, reject) => {
    _approve = resolve
    _reject = (reason) => reject(new Error(reason))
  })

  pendingConsents.set(consentId, { method, params, dappOrigin, approvalPromise, _approve, _reject })

  // Auto-expire after TTL to prevent leaks when the popup is blocked or the
  // DApp crashes before Phase 3 arrives.
  setTimeout(() => {
    const entry = pendingConsents.get(consentId)
    if (entry) {
      entry._reject('Consent request expired')
      pendingConsents.delete(consentId)
    }
  }, CONSENT_TTL_MS)
}
