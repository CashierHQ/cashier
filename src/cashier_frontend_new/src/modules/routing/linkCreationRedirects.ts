import { LinkStep } from "$modules/links/types/linkStep";
import { paths } from "./paths";
import type { RedirectDecision, RedirectInput } from "./types";

/**
 * `create` maps to `/link/create/[id]` and `detail` maps to `/link/detail/[id]`,
 * but they share the same owner-flow access rules and screen rendering logic.
 */
type OwnerRouteArea = "create" | "detail";

function debugCreationRedirect(
  message: string,
  data: Record<string, unknown> = {},
) {
  if (import.meta.env.DEV) {
    console.warn(`[redirect:create] ${message}`, data);
  }
}

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
  debugCreationRedirect("resolve", {
    routeArea,
    linkId: input.linkId,
    linkExists: input.linkExists,
    linkOwnerId: input.linkOwnerId,
    currentUserId: input.currentUserId,
    linkState: input.linkState,
    isLoading: input.isLoading,
  });

  const validationRedirect = validateOwnerAccess(input);

  if (validationRedirect) {
    debugCreationRedirect("validation decision", {
      routeArea,
      linkId: input.linkId,
      linkState: input.linkState,
      decision: validationRedirect,
    });

    return validationRedirect;
  }

  const linkId = input.linkId as string;

  const withDecisionLog = (decision: RedirectDecision): RedirectDecision => {
    debugCreationRedirect("decision", {
      routeArea,
      linkId,
      linkState: input.linkState,
      decision,
    });

    return decision;
  };

  if (routeArea === "create") {
    switch (input.linkState) {
      case LinkStep.CHOOSE_TYPE:
        return withDecisionLog({
          kind: "allow",
          screen: "createChooseType",
        });
      case LinkStep.ADD_ASSET:
        return withDecisionLog({
          kind: "allow",
          screen: "createAddAsset",
        });
      case LinkStep.PREVIEW:
        return withDecisionLog({
          kind: "allow",
          screen: "createPreview",
        });
      case LinkStep.CREATED:
        return withDecisionLog({
          kind: "allow",
          screen: "createCreated",
        });
      case LinkStep.ACTIVE:
      case LinkStep.INACTIVE:
      case LinkStep.ENDED:
        return withDecisionLog({
          kind: "redirect",
          to: paths.detail(linkId),
        });
    }
  }

  if (routeArea === "detail") {
    switch (input.linkState) {
      case LinkStep.CHOOSE_TYPE:
      case LinkStep.ADD_ASSET:
      case LinkStep.PREVIEW:
        return withDecisionLog({
          kind: "redirect",
          to: paths.create(linkId),
        });
      case LinkStep.CREATED:
      case LinkStep.ACTIVE:
      case LinkStep.INACTIVE:
      case LinkStep.ENDED:
        return withDecisionLog({
          kind: "allow",
          screen: "linkDetail",
        });
    }
  }

  return withDecisionLog({
    kind: "redirect",
    to: paths.links(),
  });
}
