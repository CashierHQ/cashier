<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getGuardContext } from "../context.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";

  let {
    requireAuth = true,
    redirectTo = "/",
    children,
  }: {
    requireAuth?: boolean;
    redirectTo?: string;
    children: Snippet;
  } = $props();

  const context = getGuardContext();

  let shouldShow = $derived(
    context.authState.isReady &&
      (!requireAuth || context.userProfile.isLoggedIn()),
  );

  $effect(() => {
    if (context.authState.isReady) {
      const isLoggedIn = context.userProfile.isLoggedIn();
      if (requireAuth && !isLoggedIn) {
        // @ts-expect-error - dynamic route path
        goto(resolve(redirectTo));
      } else if (!requireAuth && isLoggedIn) {
        // @ts-expect-error - dynamic route path
        goto(resolve(redirectTo));
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
