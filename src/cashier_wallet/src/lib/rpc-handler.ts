import { getIdentity, isAuthenticated, login, logout, refreshAuthClient } from './identity-manager'
import { signMessage } from './signer'
import { icrc1Transfer, icrc1BalanceOf } from './ledger'
import { createPendingConsent, pendingConsents } from './consent-store'
import type { RpcRequest, RpcResponse } from '@cashier-wallet/wallet-sdk'

/** Called each time a valid JSON-RPC request is received, with the method name as argument. */
type OnRequestCallback = (method: string) => void

/**
 * Initializes the wallet's postMessage listener.
 *
 * The wallet accepts connections from any DApp origin — this is intentional
 * for a public SDK. Security is enforced by the user consent flow: every
 * sensitive operation requires explicit user approval in the consent popup,
 * which displays the requesting DApp origin so the user can make an informed
 * decision.
 */
export function initRpcHandler(onRequest?: OnRequestCallback): void {
  window.addEventListener('message', async (event: MessageEvent) => {
    // Reject messages that have no origin (e.g. file:// or opaque origins)
    if (!event.origin || event.origin === 'null') return

    const req = event.data as RpcRequest
    if (req?.jsonrpc !== '2.0' || !req.method || req.id === undefined) return

    console.debug('[wallet ← dapp] received:', req)
    onRequest?.(req.method)

    if (!event.source) return
    const source = event.source as Window
    await handleRequest(req, source, event.origin)
  })
}

/**
 * Dispatch a validated JSON-RPC request to the appropriate handler and post the response.
 * @param req - The validated JSON-RPC 2.0 request object.
 * @param source - The `Window` reference of the sender (used to postMessage the response).
 * @param origin - Origin of the sender (used as `targetOrigin` for the response).
 */
async function handleRequest(
  req: RpcRequest,
  source: Window,
  origin: string
): Promise<void> {
  const respond = (result?: unknown, error?: RpcResponse['error']) => {
    const response: RpcResponse = { jsonrpc: '2.0', id: req.id }
    if (error) response.error = error
    else response.result = result
    console.debug('[wallet → dapp] sending:', response)
    source.postMessage(response, { targetOrigin: origin })
  }

  switch (req.method) {
    case 'ping':
      respond('pong')
      break

    case 'connect':
      respond({
        status: 'connected',
        walletOrigin: window.location.origin,
        version: '0.1.0'
      })
      break

    case 'is_authenticated': {
      await refreshAuthClient()
      const authed = await isAuthenticated()
      respond({ authenticated: authed })
      break
    }

    case 'login': {
      try {
        const result = await login()
        if (!result.ok) {
          respond(undefined, { code: 4001, message: result.error ?? 'Login failed or cancelled' })
          return
        }
        const identity = getIdentity()
        respond({ principal: identity?.getPrincipal().toText() })
      } catch (e) {
        respond(undefined, { code: -32603, message: String(e) })
      }
      break
    }

    case 'logout': {
      try {
        await logout()
        respond({ status: 'logged_out' })
      } catch (e) {
        respond(undefined, { code: -32603, message: String(e) })
      }
      break
    }

    case 'get_principal': {
      await refreshAuthClient()
      const authed = await isAuthenticated()
      if (!authed) {
        respond(undefined, { code: 4001, message: 'Not authenticated' })
        return
      }
      const gpp = req.params as { consentId?: string } | undefined
      if (!gpp?.consentId) {
        respond(undefined, { code: 4001, message: 'get_principal requires consent: missing consentId' })
        return
      }
      const gpConsent = pendingConsents.get(gpp.consentId)
      if (!gpConsent) {
        respond(undefined, { code: 4001, message: 'Unknown or expired consentId' })
        return
      }
      try {
        await gpConsent.approvalPromise
        pendingConsents.delete(gpp.consentId)
        const identity = getIdentity()
        respond({ principal: identity?.getPrincipal().toText() })
      } catch {
        pendingConsents.delete(gpp.consentId)
        respond(undefined, { code: 4001, message: 'User rejected the request' })
      }
      break
    }

    // Internal use only — called by the SDK's _refreshAuth after login/mount.
    // No consent required; not part of the public DApp-facing API.
    case 'get_principal_internal': {
      await refreshAuthClient()
      const authed = await isAuthenticated()
      if (!authed) {
        respond(undefined, { code: 4001, message: 'Not authenticated' })
        return
      }
      const identity = getIdentity()
      respond({ principal: identity?.getPrincipal().toText() })
      break
    }

    // ─── Consent registration ──────────────────────────────────────────────

    case 'consent_prepare': {
      const p = req.params as { method?: string; params?: unknown; consentId?: string }
      if (!p?.method || !p?.consentId) {
        respond(undefined, { code: -32602, message: 'consent_prepare: missing method or consentId' })
        return
      }
      createPendingConsent(p.consentId, p.method, p.params, origin)
      respond({ ok: true })
      break
    }

    // ─── Consent-gated methods ─────────────────────────────────────────────

    case 'sign_message': {
      await refreshAuthClient()
      const authed = await isAuthenticated()
      if (!authed) {
        respond(undefined, { code: 4001, message: 'Not authenticated' })
        return
      }
      const sp = req.params as { message?: string; consentId?: string }
      if (!sp?.message) {
        respond(undefined, { code: -32602, message: 'Missing params.message' })
        return
      }
      if (!sp.consentId) {
        respond(undefined, { code: 4001, message: 'sign_message requires consent: missing consentId' })
        return
      }
      const signConsent = pendingConsents.get(sp.consentId)
      if (!signConsent) {
        respond(undefined, { code: 4001, message: 'Unknown or expired consentId' })
        return
      }
      try {
        // Wait for the user to approve in the consent popup (resolves immediately
        // if the BroadcastChannel approval message has already arrived)
        await signConsent.approvalPromise
        pendingConsents.delete(sp.consentId)
        const result = await signMessage(sp.message)
        respond(result)
      } catch {
        pendingConsents.delete(sp.consentId)
        respond(undefined, { code: 4001, message: 'User rejected the request' })
      }
      break
    }

    case 'icrc1_balance_of': {
      await refreshAuthClient()
      const authed = await isAuthenticated()
      if (!authed) {
        respond(undefined, { code: 4001, message: 'Not authenticated' })
        return
      }
      const bp = (req.params ?? {}) as { canisterId?: string; owner?: string; consentId?: string }
      if (!bp.canisterId) {
        respond(undefined, { code: -32602, message: 'Missing params.canisterId' })
        return
      }
      if (!bp.consentId) {
        respond(undefined, { code: 4001, message: 'icrc1_balance_of requires consent: missing consentId' })
        return
      }
      const balanceConsent = pendingConsents.get(bp.consentId)
      if (!balanceConsent) {
        respond(undefined, { code: 4001, message: 'Unknown or expired consentId' })
        return
      }
      try {
        await balanceConsent.approvalPromise
        pendingConsents.delete(bp.consentId)
        const resolvedOwner = bp.owner ?? getIdentity()?.getPrincipal().toText()
        if (!resolvedOwner) {
          respond(undefined, { code: -32603, message: 'No identity available' })
          return
        }
        const balance = await icrc1BalanceOf(bp.canisterId, resolvedOwner)
        respond({ balance: balance.toString() })
      } catch (e) {
        pendingConsents.delete(bp.consentId)
        respond(undefined, { code: -32603, message: String(e) })
      }
      break
    }

    case 'icrc1_transfer': {
      await refreshAuthClient()
      const authed = await isAuthenticated()
      if (!authed) {
        respond(undefined, { code: 4001, message: 'Not authenticated' })
        return
      }
      const tp = req.params as { canisterId?: string; to?: string; amount?: string; consentId?: string }
      if (!tp?.canisterId || !tp?.to || !tp?.amount) {
        respond(undefined, { code: -32602, message: 'Missing params.canisterId, params.to, or params.amount' })
        return
      }
      if (!tp.consentId) {
        respond(undefined, { code: 4001, message: 'icrc1_transfer requires consent: missing consentId' })
        return
      }
      const transferConsent = pendingConsents.get(tp.consentId)
      if (!transferConsent) {
        respond(undefined, { code: 4001, message: 'Unknown or expired consentId' })
        return
      }
      try {
        await transferConsent.approvalPromise
        pendingConsents.delete(tp.consentId)
        const result = await icrc1Transfer({
          canisterId: tp.canisterId,
          to: tp.to,
          amount: BigInt(tp.amount)
        })
        if (result.error) {
          respond(undefined, { code: -32603, message: result.error })
        } else {
          respond({ blockIndex: result.blockIndex?.toString() })
        }
      } catch (e) {
        pendingConsents.delete(tp.consentId)
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('rejected')) {
          respond(undefined, { code: 4001, message: 'User rejected the request' })
        } else {
          respond(undefined, { code: -32603, message: msg })
        }
      }
      break
    }

    default:
      respond(undefined, { code: -32601, message: `Method not found: ${req.method}` })
  }
}
