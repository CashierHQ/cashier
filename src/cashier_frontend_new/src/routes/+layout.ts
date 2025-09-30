import { error } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";
import { accountState } from "$modules/shared/state/auth.svelte";

// Define protected routes here to match the layout component
const protectedRoutes = ["/blog"];

function isProtectedPath(path: string) {
  return protectedRoutes.some((r) => path === r || path.startsWith(r + "/"));
}

export const load: LayoutLoad = async ({ url }) => {
  const path = url.pathname;
  if (isProtectedPath(path) && !accountState.account) {
    // Throwing here runs through SvelteKit's router error flow and will render +error.svelte
    throw error(404, "Not found");
  }

  return {};
};
