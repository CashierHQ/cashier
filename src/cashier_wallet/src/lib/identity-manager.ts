import { AuthClient } from "@icp-sdk/auth/client";
import type { Identity } from "@icp-sdk/core/agent";

// Internet Identity URL — https://id.ai is an alias for https://identity.ic0.app
const II_URL = "https://id.ai/authorize";

let authClient: AuthClient | null = null;
/** Cached identity — updated after signIn and on init */
let cachedIdentity: Identity | null = null;

/**
 * Creates and caches the AuthClient singleton.
 * Safe to call multiple times — returns existing instance.
 */
export async function initAuthClient(): Promise<AuthClient> {
  if (authClient) return authClient;
  try {
    authClient = new AuthClient({ identityProvider: II_URL });
    // Restore cached identity from storage (async in v7)
    cachedIdentity = await authClient.getIdentity();
  } catch (e) {
    throw new Error(`AuthClient init failed: ${e}`);
  }
  return authClient;
}

/**
 * Opens Internet Identity popup for user authentication.
 *
 * @param derivationOrigin - optional derivation origin forwarded from the DApp.
 *   When set, II will derive the same principal as if the user logged in directly
 *   from that origin (e.g. the DApp's own origin), ensuring consistency across
 *   wallet and direct-II login flows.
 */
export async function login(
  derivationOrigin?: string
): Promise<{ ok: boolean; error?: string }> {
  let ac: AuthClient;
  try {
    ac = await initAuthClient();
  } catch (e) {
    return { ok: false, error: `AuthClient init: ${e}` };
  }

  // Rebuild client with derivationOrigin if provided (v7 sets it at construction time)
  if (derivationOrigin) {
    try {
      authClient = new AuthClient({
        identityProvider: II_URL,
        derivationOrigin,
      });
      ac = authClient;
    } catch (e) {
      return {
        ok: false,
        error: `AuthClient rebuild with derivationOrigin: ${e}`,
      };
    }
  }

  try {
    cachedIdentity = await ac.signIn();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/** Log out of the current Internet Identity session and clear the stored delegation. */
export async function logout(): Promise<void> {
  const ac = await initAuthClient();
  await ac.signOut();
  cachedIdentity = null;
}

/**
 * Return the current `Identity` held by the AuthClient.
 * Returns the cached identity synchronously; `null` if not yet initialised or after logout.
 */
export function getIdentity(): Identity | null {
  return cachedIdentity;
}

/**
 * Re-create AuthClient from storage to pick up sessions
 * created by other contexts (e.g. popup tab login).
 */
export async function refreshAuthClient(): Promise<void> {
  authClient = null;
  cachedIdentity = null;
  await initAuthClient();
}

/**
 * Check whether the current AuthClient session is still valid.
 * @returns `true` if authenticated, `false` if not initialised or session has expired.
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!authClient) return false;
  return authClient.isAuthenticated();
}
