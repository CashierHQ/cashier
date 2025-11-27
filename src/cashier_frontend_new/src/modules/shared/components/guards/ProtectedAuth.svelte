<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import type { AuthGuardConfig } from "./types";

  let {
    config,
    children,
  }: {
    config: AuthGuardConfig;
    children: Snippet;
  } = $props();

  const context = getRouteGuardContext();
  const requireAuth = config.requireAuth ?? true;
  const redirectTo = config.redirectTo ?? "/";

  let shouldShow = $derived(
    context.authState.isReady &&
      (!requireAuth || context.userProfile.isLoggedIn())
  );

  $effect(() => {
    if (context.authState.isReady) {
      const isLoggedIn = context.userProfile.isLoggedIn();
      if (requireAuth && !isLoggedIn) {
        goto(redirectTo);
      } else if (!requireAuth && isLoggedIn) {
        goto(redirectTo);
      }
    }
  });
</script>

{#if shouldShow}
  {@render children()}
{:else if context.authState.isReady}
  <div class="flex items-center justify-center p-8">Redirecting...</div>
{:else}
  <div class="flex items-center justify-center p-8">Loading...</div>
{/if}
