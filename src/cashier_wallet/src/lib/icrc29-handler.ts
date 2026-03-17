import { getIdentity, isAuthenticated, refreshAuthClient } from './identity-manager'
import { callCanister } from './signer'
import { createPendingConsent, pendingConsents } from './consent-store'

export let walletReady = false

/** Called by +page.svelte once the AuthClient is initialised. */
export function setWalletReady(): void {
  walletReady = true
}

// ── ICRC-25 static data ───────────────────────────────────────────────────

const SUPPORTED_STANDARDS = [
  { name: 'ICRC-25', url: 'https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-25/ICRC-25.md' },
  { name: 'ICRC-27', url: 'https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-27/ICRC-27.md' },
  { name: 'ICRC-49', url: 'https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-49/ICRC-49.md' },
]

const GRANTED_SCOPES = [
  { scope: { method: 'icrc27_accounts' }, state: 'granted' },
  { scope: { method: 'icrc49_call_canister' }, state: 'ask_on_use' },
]

// ── ICRC-29 postMessage server ────────────────────────────────────────────

/**
 * Attaches the ICRC-29/25/27/49 postMessage listener to the wallet window.
 *
 * Handles:
 *  icrc29_status           – heartbeat, responds pending/ready
 *  icrc25_supported_standards
 *  icrc25_request_permissions / icrc25_permissions
 *  icrc27_accounts
 *  icrc49_call_canister    – ICRC-21 consent popup + HttpAgent call
 *
 * The old custom-protocol listener in rpc-handler.ts is kept intact so
 * apps/dapp continues to work without modification.
 */
export function initIcrc29Handler(): void {
  window.addEventListener('message', async (event: MessageEvent) => {
    // Only process messages with a real origin
    if (!event.origin || event.origin === 'null') return

    const req = event.data
    if (req?.jsonrpc !== '2.0' || !req.method) return

    // Only handle ICRC-standard methods here; custom protocol handled by rpc-handler.ts
    if (!req.method.startsWith('icrc')) return

    if (!event.source) return
    const source = event.source as Window

    const respond = (
      result?: unknown,
      error?: { code: number; message: string },
    ) => {
      const response: Record<string, unknown> = { jsonrpc: '2.0', id: req.id }
      if (error) response.error = error
      else response.result = result
      source.postMessage(response, event.origin)
    }

    switch (req.method) {
      // ── ICRC-29: channel handshake ───────────────────────────────────────
      case 'icrc29_status':
        respond(walletReady ? 'ready' : 'pending')
        break

      // ── ICRC-25: discovery ───────────────────────────────────────────────
      case 'icrc25_supported_standards':
        respond({ supportedStandards: SUPPORTED_STANDARDS })
        break

      case 'icrc25_request_permissions': {
        const requestedScopes =
          (req.params as { scopes?: Array<{ method: string }> })?.scopes ?? []
        const responseScopes = requestedScopes.map((s) => ({
          scope: s,
          state: 'granted' as const,
        }))
        respond({ scopes: responseScopes })
        break
      }

      case 'icrc25_permissions':
        respond({ scopes: GRANTED_SCOPES })
        break

      // ── ICRC-27: accounts ────────────────────────────────────────────────
      case 'icrc27_accounts': {
        if (!walletReady) {
          respond(undefined, { code: -32001, message: 'Wallet not ready' })
          return
        }
        await refreshAuthClient()
        const authed = await isAuthenticated()
        if (!authed) {
          respond(undefined, { code: 3000, message: 'Not authenticated' })
          return
        }
        const identity = getIdentity()
        const owner = identity?.getPrincipal().toText() ?? null
        if (!owner) {
          respond(undefined, { code: -32603, message: 'No identity available' })
          return
        }
        respond({ accounts: [{ owner, subaccount: null }] })
        break
      }

      // ── ICRC-49: call canister with ICRC-21 consent ──────────────────────
      case 'icrc49_call_canister': {
        if (!walletReady) {
          respond(undefined, { code: -32001, message: 'Wallet not ready' })
          return
        }
        await refreshAuthClient()
        const authed49 = await isAuthenticated()
        if (!authed49) {
          respond(undefined, { code: 3000, message: 'Not authenticated' })
          return
        }

        const p = req.params as {
          canisterId?: string
          sender?: string
          method?: string
          arg?: string
        }
        if (!p?.canisterId || !p?.method || !p?.arg) {
          respond(undefined, {
            code: -32602,
            message: 'Missing canisterId, method, or arg',
          })
          return
        }

        // Register this operation with the consent store (same mechanism as
        // old consent_prepare). The popup fetches details via BroadcastChannel.
        const consentId = crypto.randomUUID()
        createPendingConsent(consentId, 'icrc49_call_canister', p, event.origin)

        // Open the wallet's /consent popup. The iframe must be embedded with
        // allow="popups" for this window.open() to succeed in major browsers.
        const popup = window.open(
          `/consent?id=${consentId}`,
          `wallet_consent_${consentId}`,
          'width=460,height=520,scrollbars=no,resizable=no',
        )
        if (!popup) {
          pendingConsents.delete(consentId)
          respond(undefined, {
            code: -32003,
            message:
              'Consent popup was blocked. Ensure the wallet iframe has allow="popups".',
          })
          return
        }

        const consent = pendingConsents.get(consentId)!
        try {
          await consent.approvalPromise
          pendingConsents.delete(consentId)
          const result = await callCanister({
            canisterId: p.canisterId,
            method: p.method,
            arg: p.arg,
          })
          respond(result)
        } catch {
          pendingConsents.delete(consentId)
          respond(undefined, { code: 3000, message: 'Action aborted by user' })
        }
        break
      }

      default:
        respond(undefined, { code: -32601, message: `Method not found: ${req.method}` })
    }
  })
}
