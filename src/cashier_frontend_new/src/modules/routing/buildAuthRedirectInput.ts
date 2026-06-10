import { authState } from "$modules/auth/state/auth.svelte";
import { userProfile } from "$modules/shared/services/userProfile.svelte";
import { parseRoute } from "$modules/routing/routeScreen";
import type { RedirectInput } from "$modules/routing/types";

/**
 * Builds redirect input for routes that only depend on auth state.
 *
 * Home and link-list routes do not need link stores, so they can provide the
 * same normalized `RedirectInput` shape directly from auth/profile state.
 *
 * @param location the current browser location, either as a string or URL object
 * @returns normalized input containing auth-only redirect data
 */
export function buildAuthRedirectInput(location: string | URL): RedirectInput {
  const pathname = typeof location === "string" ? location : location.pathname;
  const route = parseRoute(pathname);
  const isLoggedIn = userProfile.isLoggedIn();

  return {
    pathname,
    isAuthReady: authState.isReady,
    isLoading: false,
    currentUserId: isLoggedIn ? (authState.account?.owner ?? null) : null,
    linkId: route.linkId,
    linkExists: false,
    linkOwnerId: null,
    linkState: null,
    userState: null,
    linkEnded: false,
  };
}
