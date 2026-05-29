import { LinkStep } from "$modules/links/types/linkStep";
import { paths } from "./paths";
import type { RedirectDecision, RedirectInput } from "./types";

/**
 * `create` maps to `/link/create/[id]` and `detail` maps to `/link/detail/[id]`,
 * but they share the same owner-flow access rules and screen rendering logic.
 */
type OwnerRouteArea = "create" | "detail";

/**
 * Applies owner-flow validation before state-specific redirects.
 *
 * Owner routes require loaded link data, a valid link id, an existing link,
 * a logged-in user, link ownership, and non-empty owner-flow state.
 *
 * @param input normalized redirect input for the current route and link context
 * @returns a redirect or pending decision if validation fails, otherwise null
 */
function validateOwnerAccess(input: RedirectInput): RedirectDecision | null {
  if (input.isLoading) {
    return { kind: "pending" };
  }

  if (!input.linkId || !input.linkExists) {
    return { kind: "redirect", to: paths.links() };
  }

  if (!input.currentUserId || input.currentUserId !== input.linkOwnerId) {
    return { kind: "redirect", to: paths.links() };
  }

  if (input.linkState === null) {
    return { kind: "redirect", to: paths.links() };
  }

  return null;
}

/**
 * Resolves redirect behavior for create and detail routes.
 *
 * @param input normalized redirect input for the current route and link context
 * @param routeArea create or detail
 * @returns the redirect decision for the given route and owner link state
 */
export function resolveCreationRedirect(
  input: RedirectInput,
  routeArea: OwnerRouteArea,
): RedirectDecision {
  const validationRedirect = validateOwnerAccess(input);

  if (validationRedirect) {
    return validationRedirect;
  }

  const linkId = input.linkId as string;

  if (routeArea === "create") {
    switch (input.linkState) {
      case LinkStep.CHOOSE_TYPE:
        return { kind: "allow", screen: "createChooseType" };
      case LinkStep.ADD_ASSET:
        return { kind: "allow", screen: "createAddAsset" };
      case LinkStep.LOCK:
        return { kind: "allow", screen: "createLock" };
      case LinkStep.PREVIEW:
        return { kind: "allow", screen: "createPreview" };
      case LinkStep.CREATED:
        return { kind: "allow", screen: "createCreated" };
      case LinkStep.ACTIVE:
      case LinkStep.INACTIVE:
      case LinkStep.ENDED:
        return { kind: "redirect", to: paths.detail(linkId) };
    }
  }

  if (routeArea === "detail") {
    switch (input.linkState) {
      case LinkStep.CHOOSE_TYPE:
      case LinkStep.ADD_ASSET:
      case LinkStep.LOCK:
      case LinkStep.PREVIEW:
        return { kind: "redirect", to: paths.create(linkId) };
      case LinkStep.CREATED:
      case LinkStep.ACTIVE:
      case LinkStep.INACTIVE:
      case LinkStep.ENDED:
        return { kind: "allow", screen: "linkDetail" };
    }
  }

  return { kind: "redirect", to: paths.links() };
}
