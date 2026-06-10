import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import type { RedirectDecision } from "./types";

/**
 * Performs client-side navigation when redirect policy returns a redirect decision.
 *
 * Route pages call this after computing `RedirectDecision`. If the decision is
 * `allow` or `pending`, nothing happens. If the decision is `redirect`, this
 * schedules a SvelteKit `goto` after the current reactive update.
 *
 * @param getDecision returns the latest redirect decision from the route page
 */
export function useRedirectNavigation(getDecision: () => RedirectDecision) {
  // Prevent repeated effects from scheduling the same redirect more than once.
  let scheduledRedirect: string | null = null;

  $effect(() => {
    const decision = getDecision();

    if (decision.kind !== "redirect") return;

    const nextUrl = resolve(decision.to);

    if (scheduledRedirect === nextUrl) return;

    scheduledRedirect = nextUrl;

    // Defer navigation so Svelte finishes the current reactive update first.
    setTimeout(() => {
      void goto(nextUrl, { replaceState: true }).catch(() => {
        window.location.replace(nextUrl);
      });
    }, 0);
  });
}
