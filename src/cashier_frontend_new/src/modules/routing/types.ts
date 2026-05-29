import type { LinkStep } from "$modules/links/types/linkStep";
import type { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { AppPath } from "./paths";

/**
 * Screens that redirect policy can allow a route to render.
 *
 * These are UI-level screens, not URL paths. A single route can render
 * different screens depending on link state, especially `/link/create/[id]`
 * and `/link/[id]/use`.
 */
export type RouteScreen =
  | "home"
  | "linkList"
  | "createChooseType"
  | "createAddAsset"
  | "createLock"
  | "createPreview"
  | "createCreated"
  | "linkDetail"
  | "userLanding"
  | "userAddressUnlocked"
  | "userAddressLocked"
  | "userGate"
  | "userCompleted"
  | "linkEnded";

/**
 * Result returned by redirect policy.
 *
 * `pending` means the app should wait for auth or link data before deciding.
 * `allow` means the current route can render, optionally with a specific screen.
 * `redirect` means the route should navigate to a different URL path.
 */
export type RedirectDecision =
  | { kind: "pending" }
  | { kind: "allow"; screen?: RouteScreen }
  | { kind: "redirect"; to: AppPath };

/**
 * Normalized page context passed into redirect policy.
 *
 * Route pages and route context stores can expose very different data shapes.
 * This object flattens those details into the small set of fields
 * `resolveRedirect` needs to make a decision.
 *
 * @property pathname the current browser pathname, eg `/link/create/<link-id>`
 * @property isAuthReady whether auth initialization has completed
 * @property isLoading whether route-specific link data is still loading
 * @property currentUserId the current logged-in user id, or null when logged out
 * @property linkId the link id parsed from the URL, or null if not present
 * @property linkExists whether the parsed link id points to an existing link
 * @property linkOwnerId owner id of the link, or null if not available
 * @property linkState owner-flow state for the link
 * @property userState recipient/user-flow state for the public use flow
 * @property linkEnded whether the link has ended
 */
export type RedirectInput = {
  pathname: string;
  isAuthReady: boolean;
  isLoading: boolean;
  currentUserId: string | null;
  linkId: string | null;
  linkExists: boolean;
  linkOwnerId: string | null;
  linkState: LinkStep | null;
  userState: UserLinkStep | null;
  linkEnded: boolean;
};
