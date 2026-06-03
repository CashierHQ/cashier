import { UserLinkStep } from "$modules/links/types/userLinkStep";
import { paths } from "./paths";
import type { RedirectDecision, RedirectInput } from "./types";

/**
 * `userLanding` maps to `/link/[id]` and `userUse` maps to `/link/[id]/use`,
 * but they share the same public-link access rules and screen rendering logic.
 */
type UserRouteArea = "userLanding" | "userUse";

/**
 * Validates that a public link is loaded and exists.
 *
 * Invalid public links redirect to 404 because there is no owner link list to
 * send the visitor to.
 *
 * @param input normalized redirect input for the current public link route
 * @returns a redirect or pending decision if validation fails, otherwise null
 */
function validatePublicLink(input: RedirectInput): RedirectDecision | null {
  if (input.isLoading) {
    return { kind: "pending" };
  }

  if (!input.linkId || !input.linkExists) {
    return { kind: "redirect", to: paths.notFound() };
  }

  return null;
}

/**
 * Resolves redirect behavior for public link routes.
 *
 * @param input normalized redirect input for the current public link route
 * @param routeArea userLanding or userUse
 * @returns the redirect decision for the given route and user link state
 */
export function resolveUserLinkRedirect(
  input: RedirectInput,
  routeArea: UserRouteArea,
): RedirectDecision {
  const validationRedirect = validatePublicLink(input);

  if (validationRedirect) {
    return validationRedirect;
  }

  const linkId = input.linkId as string;

  // Ended links stop the user flow unless this user has already completed the link.
  if (input.linkEnded && input.userState !== UserLinkStep.COMPLETED) {
    return { kind: "allow", screen: "linkEnded" };
  }

  // Logged-out visitors can view the public landing page, but not enter the use flow.
  if (!input.currentUserId) {
    return routeArea === "userUse"
      ? { kind: "redirect", to: paths.userLanding(linkId) }
      : { kind: "allow", screen: "userLanding" };
  }

  // The landing route is only correct before the user enters the flow.
  if (routeArea === "userLanding") {
    return input.userState !== null && input.userState !== UserLinkStep.LANDING
      ? { kind: "redirect", to: paths.userUse(linkId) }
      : { kind: "allow", screen: "userLanding" };
  }

  switch (input.userState) {
    case null:
    case UserLinkStep.LANDING:
      return {
        kind: "redirect",
        to: paths.userLanding(linkId),
      };
    case UserLinkStep.ADDRESS_UNLOCKED:
      return {
        kind: "allow",
        screen: "userAddressUnlocked",
      };
    case UserLinkStep.ADDRESS_LOCKED:
      return { kind: "allow", screen: "userAddressLocked" };
    case UserLinkStep.GATE:
      return { kind: "allow", screen: "userGate" };
    case UserLinkStep.COMPLETED:
      return { kind: "allow", screen: "userCompleted" };
  }

  return { kind: "redirect", to: paths.userLanding(linkId) };
}
