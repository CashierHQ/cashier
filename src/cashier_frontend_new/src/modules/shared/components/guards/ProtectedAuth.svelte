<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";
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
  <ProtectionProcessingState message="Redirecting..." />
{:else}
  <ProtectionProcessingState message="Loading..." />
{/if}
