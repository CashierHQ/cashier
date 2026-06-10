import type { RouteContext } from "$modules/routing/routeContext.svelte";
import { LinkStep } from "$modules/links/types/linkStep";
import { LinkState as LegacyLinkState } from "$modules/links/types/link/linkState";
import type { UserLinkStep } from "$modules/links/types/userLinkStep";
import { parseRoute } from "./routeScreen";
import type { LinkLike, RedirectInput, StatefulStore } from "./types";

/**
 * Reads the current authenticated principal from the route context.
 *
 * @param context route data context initialized by `createLinkRouteContext`
 * @returns current user id, or null when logged out
 */
function getCurrentUserId(context: RouteContext): string | null {
  if (!context.userProfile.isLoggedIn()) return null;
  return context.authState.account?.owner ?? null;
}

/**
 * Resolves the owner id for the current link.
 *
 * Draft/create stores are only available to the owner, so the current user is
 * treated as the owner there. Loaded detail/user stores read the owner from the
 * link payload.
 *
 * @param context route data context initialized by `createLinkRouteContext`
 * @returns owner id, or null when it cannot be resolved
 */
function getLinkOwnerId(context: RouteContext): string | null {
  if (context.linkCreationStore || context.linkCreationStoreV3) {
    return getCurrentUserId(context);
  }

  const link = context.getLink() as LinkLike | undefined;
  if (!link?.creator) return null;
  return link.creator.toString();
}

/**
 * Reads the owner-flow link state from whichever owner route store is active.
 *
 * @param context route data context initialized by `createLinkRouteContext`
 * @returns owner-flow link step, or null when no owner store/state is available
 */
function getOwnerLinkState(context: RouteContext): LinkStep | null {
  const store =
    context.linkDetailStoreV3 ??
    context.linkDetailStore ??
    context.linkCreationStoreV3 ??
    context.linkCreationStore;

  if (!store) return null;

  try {
    return (store as StatefulStore<LinkStep>).state.step ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads the recipient/user-flow state from the active public link store.
 *
 * @param context route data context initialized by `createLinkRouteContext`
 * @returns user-flow step, or null when unavailable
 */
function getUserState(context: RouteContext): UserLinkStep | null {
  const store = context.userLinkStoreV3 ?? context.userLinkStore;
  return store?.step ?? null;
}

/**
 * Checks whether the active route store is still loading.
 *
 * @param context route data context initialized by `createLinkRouteContext`
 * @returns true while redirect policy should wait for route data
 */
function getIsLoading(context: RouteContext): boolean {
  return context.isLoading({ checkTempLinkLoad: true });
}

/**
 * Determines whether the link has ended across current and legacy state shapes.
 *
 * @param context route data context initialized by `createLinkRouteContext`
 * @param linkState normalized owner-flow step, when available
 * @returns true when the link should be treated as ended
 */
function getLinkEnded(context: RouteContext, linkState: LinkStep | null) {
  const link = context.getLink() as LinkLike | undefined;
  const useCount = link?.link_use_action_counter ?? link?.use_count;
  const maxUse = link?.link_use_action_max_count ?? link?.max_use;
  const isFullyUsed =
    useCount !== undefined &&
    maxUse !== undefined &&
    BigInt(maxUse) > 0n &&
    BigInt(useCount) >= BigInt(maxUse);

  return (
    linkState === LinkStep.ENDED ||
    link?.state === LegacyLinkState.INACTIVE ||
    link?.state === LegacyLinkState.INACTIVE_ENDED ||
    isFullyUsed
  );
}

/**
 * Builds the normalized redirect object for the current route, user, and link state.
 *
 * This function is the adapter between real app stores and the pure redirect
 * policy. It lets `resolveRedirect` stay independent of Svelte components,
 * stores, and backend response shapes.
 *
 * @param context route data context initialized by `createLinkRouteContext`
 * @param location the current browser location, either as a string or URL object
 * @returns normalized input containing all data redirect policy needs
 */
export function buildRedirectInput(
  context: RouteContext,
  location: string | URL,
): RedirectInput {
  const pathname = typeof location === "string" ? location : location.pathname;
  const route = parseRoute(pathname);
  const linkState = getOwnerLinkState(context);

  const input = {
    pathname,
    isAuthReady: context.authState.isReady,
    isLoading: getIsLoading(context),
    currentUserId: getCurrentUserId(context),
    linkId: route.linkId,
    linkExists: context.hasLink(),
    linkOwnerId: getLinkOwnerId(context),
    linkState,
    userState: getUserState(context),
    linkEnded: getLinkEnded(context, linkState),
  };

  return input;
}
