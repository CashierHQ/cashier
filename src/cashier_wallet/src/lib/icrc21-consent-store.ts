/**
 * BroadcastChannel bridge for ICRC-21 consent prompts before ICRC-49 calls.
 *
 * The OISY Signer calls the `icrc21_call_consent_message` prompt multiple times
 * for a single ICRC-49 request with different statuses:
 *   1. { status: 'loading' }  — OISY is fetching consent from target canister
 *   2. { status: 'result', consentInfo, approve, reject } — consent ready
 *      OR { status: 'error', details }                    — fetch failed (no approve/reject)
 *
 * This store tracks the per-request state. The `oisyApprove`/`oisyReject`
 * callbacks are injected when the `result` status fires. The BroadcastChannel
 * bridge lets the popup page call them via the stored references.
 *
 * Flow:
 *   1. oisy-signer-init receives 'loading' → createPendingConsent21(), open popup
 *   2. Popup sends 'icrc21_get' → store responds with 'icrc21_data' (current state)
 *   3. oisy-signer-init receives 'result' → updateConsent21Result() stores approve/reject
 *      + pushes 'icrc21_status_update' to popup
 *   4. User approves/rejects in popup → 'icrc21_approved' / 'icrc21_rejected'
 *   5. Store calls the stored oisyApprove()/oisyReject() → OISY executes/aborts ICRC-49
 *
 * Error case:
 *   oisy-signer-init receives 'error' → updateConsent21Error() informs the popup
 *   The 'error' variant has no approve/reject — OISY handles rejection internally.
 *   The popup shows an error state (informational) and can close.
 */

import type { icrc21_consent_info } from './icrc21-types'

export type Consent21Status = 'loading' | 'result' | 'error'

interface PendingConsent21 {
  origin: string
  status: Consent21Status
  consentInfo?: icrc21_consent_info
  errorDetails?: unknown
  /** Set from OISY payload.approve when status transitions to 'result' */
  oisyApprove: () => void
  /** Set from OISY payload.reject when status transitions to 'result' */
  oisyReject: () => void
}

/** Active pending ICRC-21 consent entries keyed by requestId */
export const pendingConsents21 = new Map<string, PendingConsent21>()

/** Auto-expire after 5 minutes — if popup is closed without action */
const CONSENT21_TTL_MS = 5 * 60 * 1_000

let _consentChannel21: BroadcastChannel | null = null

function getConsentChannel21(): BroadcastChannel {
  if (!_consentChannel21) {
    _consentChannel21 = new BroadcastChannel('wallet-icrc21-consent')
    _consentChannel21.onmessage = (event: MessageEvent) => {
      const { type, requestId } = (event.data ?? {}) as { type?: string; requestId?: string }
      if (!type || !requestId) return

      const entry = pendingConsents21.get(requestId)

      switch (type) {
        case 'icrc21_get': {
          if (entry) {
            _consentChannel21!.postMessage({
              type: 'icrc21_data',
              requestId,
              status: entry.status,
              consentInfo: entry.consentInfo,
              errorDetails: entry.errorDetails,
              origin: entry.origin,
            })
          }
          break
        }
        case 'icrc21_approved': {
          if (entry) {
            entry.oisyApprove()
            pendingConsents21.delete(requestId)
          }
          break
        }
        case 'icrc21_rejected': {
          if (entry) {
            entry.oisyReject()
            pendingConsents21.delete(requestId)
          }
          break
        }
      }
    }
  }
  return _consentChannel21
}

/**
 * Register a new pending ICRC-21 consent entry in 'loading' state.
 * Called when the OISY Signer fires the prompt with status === 'loading'.
 */
export function createPendingConsent21(requestId: string, origin: string): void {
  getConsentChannel21() // ensure channel is listening before popup opens
  // Placeholder callbacks — replaced by real OISY ones when 'result' arrives.
  // If TTL fires before 'result', calling these is a no-op.
  const noop = () => {}

  pendingConsents21.set(requestId, {
    origin,
    status: 'loading',
    oisyApprove: noop,
    oisyReject: noop,
  })

  // Auto-expire: if the popup is closed without action, reject the call
  setTimeout(() => {
    const entry = pendingConsents21.get(requestId)
    if (entry) {
      entry.oisyReject()
      pendingConsents21.delete(requestId)
    }
  }, CONSENT21_TTL_MS)
}

/**
 * Update the pending consent when OISY transitions to 'result' state.
 * Stores the real approve/reject callbacks and broadcasts a status update
 * to the open popup page.
 */
export function updateConsent21Result(
  requestId: string,
  consentInfo: icrc21_consent_info,
  approve: () => void,
  reject: () => void,
): void {
  const entry = pendingConsents21.get(requestId)
  if (!entry) return

  entry.oisyApprove = approve
  entry.oisyReject = reject
  entry.status = 'result'
  entry.consentInfo = consentInfo

  getConsentChannel21().postMessage({
    type: 'icrc21_status_update',
    requestId,
    status: 'result',
    consentInfo,
  })
}

/**
 * Update the pending consent when OISY transitions to 'error' state.
 * The 'error' variant has no approve/reject — OISY handles rejection internally.
 * We push the error state to the popup for display, then clean up.
 */
export function updateConsent21Error(requestId: string, errorDetails?: unknown): void {
  const entry = pendingConsents21.get(requestId)
  if (!entry) return

  entry.status = 'error'
  entry.errorDetails = errorDetails

  getConsentChannel21().postMessage({
    type: 'icrc21_status_update',
    requestId,
    status: 'error',
    errorDetails,
  })

  // Clean up — OISY handles the ICRC-49 rejection internally on error
  pendingConsents21.delete(requestId)
}
