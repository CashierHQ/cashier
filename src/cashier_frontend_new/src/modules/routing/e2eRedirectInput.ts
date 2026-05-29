import { LinkStep } from "$modules/links/types/linkStep";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { parseRoute } from "./routeScreen";
import type { RedirectInput, RouteScreen } from "./types";

const ownerId = "e2e-owner";
const otherUserId = "e2e-other-user";
const e2eFlag = "e2eRedirect";

const linkStates: Record<string, LinkStep | null> = {
  noState: null,
  chooseType: LinkStep.CHOOSE_TYPE,
  addAsset: LinkStep.ADD_ASSET,
  lock: LinkStep.LOCK,
  preview: LinkStep.PREVIEW,
  created: LinkStep.CREATED,
  active: LinkStep.ACTIVE,
  inactive: LinkStep.INACTIVE,
  ended: LinkStep.ENDED,
};

const userStates: Record<string, UserLinkStep | null> = {
  noState: null,
  landing: UserLinkStep.LANDING,
  addressUnlocked: UserLinkStep.ADDRESS_UNLOCKED,
  addressLocked: UserLinkStep.ADDRESS_LOCKED,
  gate: UserLinkStep.GATE,
  completed: UserLinkStep.COMPLETED,
};

/**
 * Checks whether redirect E2E overrides should be used for the current URL.
 *
 * This is deliberately blocked in production and requires an explicit query
 * flag so normal app traffic always uses real auth/link data.
 *
 * @param location current browser location
 * @returns true when Playwright redirect overrides are active
 */
export function isE2ERedirectEnabled(location: string | URL): boolean {
  if (import.meta.env.MODE === "production") return false;

  const url = toUrl(location);
  return url.searchParams.get(e2eFlag) === "1";
}

/**
 * Builds deterministic redirect input for Playwright route-policy tests.
 *
 * Real redirect input comes from auth/link stores. Browser tests need the same
 * route policy and navigation behavior without depending on backend fixtures,
 * so this adapter provides controlled auth, link, and user-flow states from
 * query params in `e2e` mode only.
 *
 * @param location current browser location
 * @returns redirect input override, or null outside E2E override mode
 */
export function buildE2ERedirectInput(
  location: string | URL,
): RedirectInput | null {
  if (!isE2ERedirectEnabled(location)) return null;

  const url = toUrl(location);
  const route = parseRoute(url.pathname);
  const auth = url.searchParams.get("auth");
  const currentUserId =
    auth === "owner" ? ownerId : auth === "otherUser" ? otherUserId : null;
  const linkExists =
    route.linkId !== null && url.searchParams.get("linkExists") !== "false";
  const linkState = readMappedValue(url.searchParams, "linkState", linkStates);
  const userState = readMappedValue(url.searchParams, "userState", userStates);
  const linkEnded =
    url.searchParams.get("linkEnded") === "true" || linkState === LinkStep.ENDED;

  return {
    pathname: url.pathname,
    isAuthReady: true,
    isLoading: false,
    currentUserId,
    linkId: route.linkId,
    linkExists,
    linkOwnerId: linkExists ? ownerId : null,
    linkState,
    userState,
    linkEnded,
  };
}

/**
 * Preserves E2E query params across client-side redirects.
 *
 * Redirect decisions only know their target path. In E2E mode, the query params
 * are the fixture data, so they need to survive `goto` navigation.
 *
 * @param targetPath redirect target path from policy
 * @returns target path with current E2E fixture params appended
 */
export function withE2ERedirectSearch(targetPath: string): string {
  if (import.meta.env.MODE !== "e2e" || typeof window === "undefined") {
    return targetPath;
  }

  const current = new URL(window.location.href);
  if (current.searchParams.get(e2eFlag) !== "1") return targetPath;

  const next = new URL(targetPath, current.origin);
  current.searchParams.forEach((value, key) => {
    next.searchParams.set(key, value);
  });

  return `${next.pathname}${next.search}${next.hash}`;
}

/**
 * Human-readable labels used by the E2E marker component.
 */
export const e2eScreenLabels: Record<RouteScreen, string> = {
  home: "home",
  linkList: "linkList",
  createChooseType: "createChooseType",
  createAddAsset: "createAddAsset",
  createLock: "createLock",
  createPreview: "createPreview",
  createCreated: "createCreated",
  linkDetail: "linkDetail",
  userLanding: "userLanding",
  userAddressUnlocked: "userAddressUnlocked",
  userAddressLocked: "userAddressLocked",
  userGate: "userGate",
  userCompleted: "userCompleted",
  linkEnded: "linkEnded",
};

function readMappedValue<T>(
  params: URLSearchParams,
  key: string,
  values: Record<string, T | null>,
): T | null {
  const rawValue = params.get(key);
  if (!rawValue) return null;
  return values[rawValue] ?? null;
}

function toUrl(location: string | URL): URL {
  if (location instanceof URL) return location;
  return new URL(location, "http://localhost");
}
