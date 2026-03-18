import { AuthClient } from '@dfinity/auth-client'
import type { Identity } from '@dfinity/agent'
import { PUBLIC_CASHIER_ORIGIN } from "$env/static/public";

// Internet Identity URL — https://id.ai is an alias for https://identity.ic0.app
const II_URL = 'https://id.ai'

// Cashier frontend origin — wallet uses this as derivationOrigin so II derives
// the same principal as the cashier app. Set per-environment via PUBLIC_CASHIER_ORIGIN.
const CASHIER_ORIGIN = PUBLIC_CASHIER_ORIGIN || undefined;

let authClient: AuthClient | null = null

/**
 * Creates and caches the AuthClient singleton.
 * Safe to call multiple times — returns existing instance.
 */
export async function initAuthClient(): Promise<AuthClient> {
  if (authClient) return authClient
  try {
    authClient = await AuthClient.create()
  } catch (e) {
    throw new Error(`AuthClient init failed: ${e}`)
  }
  return authClient
}

/**
 * Opens Internet Identity popup for user authentication.
 * Returns true on success, false on failure or cancellation.
 */
export async function login(): Promise<{ ok: boolean; error?: string }> {
  let ac: AuthClient
  try {
    ac = await initAuthClient()
  } catch (e) {
    return { ok: false, error: `AuthClient init: ${e}` }
  }
  return new Promise((resolve) => {
    try {
      ac.login({
        identityProvider: II_URL,
        ...(CASHIER_ORIGIN ? { derivationOrigin: CASHIER_ORIGIN } : {}),
        onSuccess: () => resolve({ ok: true }),
        onError: (err) => {
          const msg = typeof err === 'string' ? err : String(err)
          console.error('[identity-manager] login error:', msg)
          resolve({ ok: false, error: msg })
        }
      })
    } catch (e) {
      resolve({ ok: false, error: `login call failed: ${e}` })
    }
  })
}

/** Log out of the current Internet Identity session and clear the stored delegation. */
export async function logout(): Promise<void> {
  const ac = await initAuthClient()
  await ac.logout()
}

/**
 * Return the current `Identity` held by the AuthClient.
 * @returns The active `Identity`, or `null` if the AuthClient has not been initialised.
 */
export function getIdentity(): Identity | null {
  return authClient?.getIdentity() ?? null
}

/**
 * Re-create AuthClient from storage to pick up sessions
 * created by other contexts (e.g. popup tab login).
 */
export async function refreshAuthClient(): Promise<void> {
  authClient = null
  await initAuthClient()
}

/**
 * Check whether the current AuthClient session is still valid.
 * @returns `true` if authenticated, `false` if not initialised or session has expired.
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!authClient) return false
  return authClient.isAuthenticated()
}
