/**
 * Initialises the `@dfinity/oisy-wallet-signer` Signer and wires its prompts
 * to the wallet's popup pages via BroadcastChannel stores.
 *
 * This module replaces `icrc29-handler.ts`. The OISY Signer attaches its own
 * `postMessage` listener and handles all ICRC-29/25/27/49 message routing
 * internally. Prompts are wired to:
 *   - /icrc25-permissions — ICRC-25 permission request popup
 *   - /icrc21-consent     — ICRC-21 consent before ICRC-49 popup
 *
 * The existing `rpc-handler.ts` continues to run in parallel for the
 * custom RPC protocol (consent_prepare, sign_message, icrc1_transfer, …).
 */

import { env } from '$env/dynamic/public';
import {
  ICRC21_CALL_CONSENT_MESSAGE,
  ICRC25_REQUEST_PERMISSIONS,
  ICRC27_ACCOUNTS,
  ICRC49_CALL_CANISTER,
} from '@dfinity/oisy-wallet-signer';
import { Signer } from '@dfinity/oisy-wallet-signer/signer';
import {
  createPendingConsent21,
  updateConsent21Error,
} from './icrc21-consent-store';
import {
  createPendingPermission,
  pendingPermissions,
  type IcrcScope,
} from './icrc25-permission-store';
import { getIdentity, refreshAuthClient } from './identity-manager';

const IC_HOST = env.PUBLIC_ICP_HOST ?? 'https://icp-api.io';

/** Set to true once the Signer is initialised and ready to handle ICRC-29 messages */
export let walletReady = false;

let signerInstance: Signer | null = null;

/**
 * Tracks the requestId of the ICRC-21 consent flow that is currently in
 * progress. Since the OISY Signer serialises requests (only one at a time),
 * at most one entry can be in-flight at any given moment.
 */
let currentIcrc21RequestId: string | null = null;

/**
 * Initialise the OISY Signer and register prompt handlers.
 * Must be called after the user has authenticated (non-anonymous identity).
 * Sets `walletReady = true` on success.
 */
export async function initOisySigner(): Promise<void> {
  await refreshAuthClient();
  const identity = getIdentity();
  if (!identity || identity.getPrincipal().isAnonymous()) {
    return;
  }

  // Disconnect any previous instance (e.g. after logout/re-login)
  signerInstance?.disconnect();

  // The OISY Signer sends all responses via window.opener.postMessage().
  // When running inside a hidden <iframe> (IframeTransport), window.opener is
  // null. Bridge it to window.parent so responses reach the dApp correctly.
  if (!window.opener && window.parent !== window) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).opener = window.parent;
  }

  signerInstance = Signer.init({ owner: identity, host: IC_HOST });

  // ── ICRC-25: permission request prompt ─────────────────────────────────
  // The OISY Signer calls this when a dApp sends icrc25_request_permissions.
  // We open a popup so the user can grant or deny each scope.
  signerInstance.register({
    method: ICRC25_REQUEST_PERMISSIONS,
    prompt: ({ origin, requestedScopes, confirm }) => {
      const requestId = crypto.randomUUID();

      createPendingPermission(
        requestId,
        requestedScopes as IcrcScope[],
        origin,
        confirm
      );

      const popup = window.open(
        `/icrc25-permissions?id=${requestId}`,
        `icrc25_${requestId}`,
        'width=440,height=540,resizable=no'
      );

      if (!popup) {
        // Popup blocked — deny all scopes immediately
        const deniedScopes = (requestedScopes as IcrcScope[]).map((s) => ({
          scope: s.scope,
          state: 'denied' as const,
        }));
        confirm(deniedScopes);
        pendingPermissions.delete(requestId);
      }
    },
  });

  // ── ICRC-27: accounts prompt ───────────────────────────────────────────
  // Auto-approve with the authenticated principal — the user already
  // consented by completing Internet Identity login.
  signerInstance.register({
    method: ICRC27_ACCOUNTS,
    prompt: ({ approve, reject }) => {
      const id = getIdentity();
      if (!id) {
        reject();
        return;
      }
      approve([{ owner: id.getPrincipal().toText() }]);
    },
  });

  // ── ICRC-21: consent message prompt (multi-phase) ───────────────────────
  // The OISY Signer calls this up to three times per ICRC-49 request:
  //   1. status === 'loading' — fetching ICRC-21 from target canister
  //   2. status === 'result'  — consent ready; approve() / reject() provided
  //   3. status === 'error'   — fetch failed; no approve/reject (OISY rejects internally)
  //
  // The popup is opened only on 'result' — not during 'loading' — because many
  // standard ICRC-1 ledgers don't implement ICRC-21. Opening early then showing
  // an error state produces a confusing window the user must manually dismiss.
  // On 'error', OISY rejects the ICRC-49 call internally; we just clean up silently.
  signerInstance.register({
    method: ICRC21_CALL_CONSENT_MESSAGE,
    prompt: (payload) => {
      console.log(`ICRC-21 prompt: status=${payload.status}`, payload);
      if (payload.status === 'loading') {
        const requestId = crypto.randomUUID();
        currentIcrc21RequestId = requestId;
        createPendingConsent21(requestId, payload.origin);
        // Popup deferred until 'result' — canister may not support ICRC-21.
      } else if (payload.status === 'result') {
        console.log(`consent info:`, payload.consentInfo);

        // const requestId = currentIcrc21RequestId;
        // if (!requestId) return;

        // const popup = window.open(
        //   `/icrc21-consent?id=${requestId}`,
        //   `icrc21_${requestId}`,
        //   'width=440,height=600,resizable=no'
        // );

        // if (!popup) {
        //   payload.reject();
        //   currentIcrc21RequestId = null;
        //   return;
        // }

        // updateConsent21Result(
        //   requestId,
        //   payload.consentInfo as icrc21_consent_info,
        //   payload.approve,
        //   payload.reject
        // );

        // auto approve
        payload.approve();
      } else if (payload.status === 'error') {
        const requestId = currentIcrc21RequestId;
        if (requestId) {
          // Clean up store silently — OISY handles ICRC-49 rejection internally.
          updateConsent21Error(requestId, payload.details);
        }
        currentIcrc21RequestId = null;
      }
    },
  });

  // ── ICRC-49: call canister status prompt (no-op) ───────────────────────
  // The user already approved at the ICRC-21 stage. This prompt receives
  // status updates — no UI action required.
  signerInstance.register({
    method: ICRC49_CALL_CANISTER,
    prompt: ({ status, ...rest }) => {
      console.log(`ICRC-49 result: status=${status}`, rest);
      if (status === 'result') {
        console.log(`ICRC-49 call successful:`, rest);
      }
    },
  });

  walletReady = true;
}

/**
 * Disconnects the OISY Signer and resets wallet state.
 * Call on user logout or page unload.
 */
export function disconnectSigner(): void {
  signerInstance?.disconnect();
  signerInstance = null;
  walletReady = false;
  currentIcrc21RequestId = null;
}
