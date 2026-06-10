import type { LinkStep } from "$modules/links/types/linkStep";
import type { UserLinkStep } from "$modules/links/types/userLinkStep";

/**
 * ISO country code returned by the IP location resolver.
 *
 * This is currently a string because the resolver can return any valid
 * country code; it can be narrowed to a finite union if needed later.
 */
export type CountryCode = string;

/**
 * Country descriptor used by IP protection data.
 */
export type Country = {
  /** ISO country code, for example `US` or `CA`. */
  isoCode: CountryCode;
};

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
  /** Public or backend link id parsed from the current route. */
  linkId?: string;
  /** Temporary draft link id used by the creation flow before backend creation. */
  draftLinkId?: string;
  /** Route context store type to initialize for the current page. */
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
 * Public user routes that share recipient-flow redirect rules.
 *
 * `userLanding` maps to `/link/[id]` and `userUse` maps to `/link/[id]/use`,
 * but both use the same public-link access checks and state mapping.
 */
export type UserRouteArea = "userLanding" | "userUse";

/**
 * Known route areas that the redirect policy understands.
 *
 * These are broad URL areas, not renderable screens.
 */
export type RouteArea =
  | "home"
  | "linkList"
  | "create"
  | "detail"
  | "userLanding"
  | "userUse"
  | "unknown";

/**
 * Parsed result of matching a pathname to a known route pattern.
 *
 * @property area the high-level route area the pathname belongs to
 * @property linkId the link id parsed from the pathname, if any
 */
export type RouteMatch = {
  /** High-level route area the pathname belongs to. */
  area: RouteArea;
  /** Link id parsed from the pathname, or null when the route has no link id. */
  linkId: string | null;
};

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
 * Normalized IP protection context used by global route protection.
 *
 * @property isLoading whether the IP location query is still loading
 * @property countryCode the resolved country code for the current user
 * @property isBlacklisted whether the resolved country should be blocked
 */
export type IpProtectionInput = {
  /** Whether the IP location query is still loading. */
  isLoading: boolean;
  /** Resolved visitor country code, or null when no country could be resolved. */
  countryCode: string | null;
  /** Whether the resolved visitor country is blocked by policy. */
  isBlacklisted: boolean;
};

/**
 * Result returned by IP protection policy.
 *
 * `pending` means route rendering should wait for IP lookup.
 * `allow` means the current route can render.
 * `block` means the app should show the region-blocked screen.
 */
export type IpProtectionDecision =
  | { kind: "pending" }
  | { kind: "allow" }
  | { kind: "block" };

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
  /** Current browser pathname, for example `/link/create/<link-id>`. */
  pathname: string;
  /** Whether auth initialization has completed. */
  isAuthReady: boolean;
  /** Whether route-specific link data is still loading. */
  isLoading: boolean;
  /** Current logged-in user id, or null when logged out. */
  currentUserId: string | null;
  /** Link id parsed from the URL, or null if not present. */
  linkId: string | null;
  /** Whether the parsed link id points to an existing link. */
  linkExists: boolean;
  /** Owner id of the link, or null if not available. */
  linkOwnerId: string | null;
  /** Owner-flow state for the link. */
  linkState: LinkStep | null;
  /** Recipient/user-flow state for the public use flow. */
  userState: UserLinkStep | null;
  /** Whether the link has ended. */
  linkEnded: boolean;
};

/**
 * Minimal link payload shape required by the redirect input adapter.
 *
 * The active route context can expose links from draft, detail, or legacy
 * stores, so the adapter reads only the fields needed for redirect decisions.
 */
export type LinkLike = {
  /** Link creator principal or principal-like value. */
  creator?: { toString(): string } | string;
  /** Raw link state read from draft/detail/legacy stores. */
  state?: string;
  /** Legacy use counter value. */
  link_use_action_counter?: bigint | number;
  /** Legacy max-use value. */
  link_use_action_max_count?: bigint | number;
  /** Current use counter value. */
  use_count?: bigint | number;
  /** Max-use value. */
  max_use?: bigint | number;
};

/**
 * Generic state wrapper used by owner-flow stores.
 */
export type StepState<TStep> = {
  /** Current step for the owning state machine. */
  step: TStep;
};

/**
 * Minimal store shape for reading the active route step.
 */
export type StatefulStore<TStep> = {
  /** Store state wrapper that exposes the current step. */
  state: StepState<TStep>;
};
