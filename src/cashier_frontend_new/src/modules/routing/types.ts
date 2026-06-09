import type { LinkStep } from "$modules/links/types/linkStep";
import type { UserLinkStep } from "$modules/links/types/userLinkStep";

/**
 * Internal app paths that can be used for redirects.
 */
export type AppPath =
  | "/"
  | "/404"
  | "/links"
  | `/link/create/${string}`
  | `/link/detail/${string}`
  | `/link/detail/${string}?created=true`
  | `/link/${string}`
  | `/link/${string}/use`;

/**
 * Options used when creating route-scoped link context.
 */
export type LinkRouteContextOptions = {
  linkId?: string;
  draftLinkId?: string;
  storeType?: "userLink" | "linkDetail";
};

/**
 * Owner routes that share create/detail redirect rules.
 *
 * `create` maps to `/link/create/[id]` and `detail` maps to `/link/detail/[id]`,
 * but both use the same owner-flow access checks and state mapping.
 */
export type OwnerRouteArea = "create" | "detail";

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

/**
 * Minimal link payload shape required by the redirect input adapter.
 *
 * The active route context can expose links from draft, detail, or legacy
 * stores, so the adapter reads only the fields needed for redirect decisions.
 */
export type LinkLike = {
  creator?: { toString(): string } | string;
  state?: string;
  link_use_action_counter?: bigint | number;
  link_use_action_max_count?: bigint | number;
  use_count?: bigint | number;
  max_use?: bigint | number;
};

/**
 * Generic state wrapper used by owner-flow stores.
 */
export type StepState<TStep> = {
  step: TStep;
};

/**
 * Minimal store shape for reading the active route step.
 */
export type StatefulStore<TStep> = {
  state: StepState<TStep>;
};
