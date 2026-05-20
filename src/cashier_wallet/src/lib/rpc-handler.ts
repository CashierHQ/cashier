import type { RpcRequest, RpcResponse } from '@cashier-wallet/wallet-sdk';
import { createPendingConsent, pendingConsents } from './consent-store';
import {
  getIdentity,
  isAuthenticated,
  login,
  logout,
  refreshAuthClient,
} from './identity-manager';
import { signMessage } from './signer';

/** Called each time a valid JSON-RPC request is received, with the method name as argument. */
type OnRequestCallback = (method: string) => void;

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
    if (!event.origin || event.origin === 'null') return;

    const req = event.data as RpcRequest;
    if (req?.jsonrpc !== '2.0' || !req.method || req.id === undefined) return;

    // Skip ICRC-25/27/29/49 signer-standard methods — handled exclusively by icrc29-handler.ts
    if (/^icrc(25|27|29|49)_/.test(req.method)) return;

    onRequest?.(req.method);

    if (!event.source) return;
    const source = event.source as Window;
    await handleRequest(req, source, event.origin);
  });
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
    const response: RpcResponse = { jsonrpc: '2.0', id: req.id };
    if (error) response.error = error;
    else response.result = result;
    source.postMessage(response, { targetOrigin: origin });
  };

  switch (req.method) {
    case 'ping':
      respond('pong');
      break;

    case 'connect':
      respond({
        status: 'connected',
        walletOrigin: window.location.origin,
        version: '0.1.0',
      });
      break;

    case 'is_authenticated': {
      await refreshAuthClient();
      const authed = await isAuthenticated();
      respond({ authenticated: authed });
      break;
    }

    case 'login': {
      try {
        const result = await login();
        if (!result.ok) {
          respond(undefined, {
            code: 4001,
            message: result.error ?? 'Login failed or cancelled',
          });
          return;
        }
        const identity = getIdentity();
        respond({ principal: identity?.getPrincipal().toText() });
      } catch (e) {
        respond(undefined, { code: -32603, message: String(e) });
      }
      break;
    }

    case 'logout': {
      try {
        await logout();
        respond({ status: 'logged_out' });
      } catch (e) {
        respond(undefined, { code: -32603, message: String(e) });
      }
      break;
    }

    case 'get_principal': {
      await refreshAuthClient();
      const authed = await isAuthenticated();
      if (!authed) {
        respond(undefined, { code: 4001, message: 'Not authenticated' });
        return;
      }
      const gpp = req.params as { consentId?: string } | undefined;
      if (!gpp?.consentId) {
        respond(undefined, {
          code: 4001,
          message: 'get_principal requires consent: missing consentId',
        });
        return;
      }
      const gpConsent = pendingConsents.get(gpp.consentId);
      if (!gpConsent) {
        respond(undefined, {
          code: 4001,
          message: 'Unknown or expired consentId',
        });
        return;
      }
      try {
        await gpConsent.approvalPromise;
        pendingConsents.delete(gpp.consentId);
        const identity = getIdentity();
        respond({ principal: identity?.getPrincipal().toText() });
      } catch {
        pendingConsents.delete(gpp.consentId);
        respond(undefined, {
          code: 4001,
          message: 'User rejected the request',
        });
      }
      break;
    }

    // Internal use only — called by the SDK's _refreshAuth after login/mount.
    // No consent required; not part of the public DApp-facing API.
    case 'get_principal_internal': {
      await refreshAuthClient();
      const authed = await isAuthenticated();
      if (!authed) {
        respond(undefined, { code: 4001, message: 'Not authenticated' });
        return;
      }
      const identity = getIdentity();
      respond({ principal: identity?.getPrincipal().toText() });
      break;
    }

    // ─── Consent registration ──────────────────────────────────────────────

    case 'consent_prepare': {
      const p = req.params as {
        method?: string;
        params?: unknown;
        consentId?: string;
      };
      if (!p?.method || !p?.consentId) {
        respond(undefined, {
          code: -32602,
          message: 'consent_prepare: missing method or consentId',
        });
        return;
      }
      createPendingConsent(p.consentId, p.method, p.params, origin);
      respond({ ok: true });
      break;
    }

    // ─── Consent-gated methods ─────────────────────────────────────────────

    case 'sign_message': {
      await refreshAuthClient();
      const authed = await isAuthenticated();
      if (!authed) {
        respond(undefined, { code: 4001, message: 'Not authenticated' });
        return;
      }
      const sp = req.params as { message?: string; consentId?: string };
      if (!sp?.message) {
        respond(undefined, { code: -32602, message: 'Missing params.message' });
        return;
      }
      if (!sp.consentId) {
        respond(undefined, {
          code: 4001,
          message: 'sign_message requires consent: missing consentId',
        });
        return;
      }
      const signConsent = pendingConsents.get(sp.consentId);
      if (!signConsent) {
        respond(undefined, {
          code: 4001,
          message: 'Unknown or expired consentId',
        });
        return;
      }
      try {
        // Wait for the user to approve in the consent popup (resolves immediately
        // if the BroadcastChannel approval message has already arrived)
        await signConsent.approvalPromise;
        pendingConsents.delete(sp.consentId);
        const result = await signMessage(sp.message);
        respond(result);
      } catch {
        pendingConsents.delete(sp.consentId);
        respond(undefined, {
          code: 4001,
          message: 'User rejected the request',
        });
      }
      break;
    }

    default:
      respond(undefined, {
        code: -32601,
        message: `Method not found: ${req.method}`,
      });
  }
}
