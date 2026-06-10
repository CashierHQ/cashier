import { paths } from "$modules/routing/paths";
import { resolveCreationRedirect } from "$modules/routing/resolvers/linkCreationRedirects";
import { resolveUserLinkRedirect } from "$modules/routing/userLinkRedirects";
import { parseRoute } from "$modules/routing/routeScreen";
import type { RedirectDecision, RedirectInput } from "$modules/routing/types";

/**
 * Resolves the redirect decision for a given route, user, and link state.
 *
 * This is the main entry point for redirect logic. It applies global route
 * rules first, then delegates to owner-flow or user-flow policies based on
 * the parsed route area.
 *
 * @param input normalized redirect context for the current page load
 * @returns whether the current route should render, wait, or redirect
 */
export function resolveRedirect(input: RedirectInput): RedirectDecision {
  const route = parseRoute(input.pathname);
  const linkId = input.linkId ?? route.linkId;
  const resolvedInput = { ...input, linkId };

  // Auth is async in the real app, so do not redirect until auth state is known.
  if (!input.isAuthReady) {
    return { kind: "pending" };
  }

  // Home is public for logged-out users, but logged-in users should go to their link list.
  if (route.area === "home") {
    return input.currentUserId
      ? { kind: "redirect", to: paths.links() }
      : { kind: "allow", screen: "home" };
  }

  // Logged-out users should only access public landing pages.
  if (!input.currentUserId && route.area !== "userLanding") {
    // If a logged-out user lands deep in the use flow, send them back to public link landing.
    if (route.area === "userUse" && linkId) {
      return { kind: "redirect", to: paths.userLanding(linkId) };
    }
    return { kind: "redirect", to: paths.home() };
  }

  if (route.area === "linkList") {
    return { kind: "allow", screen: "linkList" };
  }

  // Owner create/detail routes share policy because both depend on owner link state.
  if (route.area === "create" || route.area === "detail") {
    return resolveCreationRedirect(resolvedInput, route.area);
  }

  // Public user routes share policy because landing/use depend on recipient progress.
  if (route.area === "userLanding" || route.area === "userUse") {
    return resolveUserLinkRedirect(resolvedInput, route.area);
  }

  // Unknown or unhandled routes are not blocked by redirect policy.
  return { kind: "allow" };
}
