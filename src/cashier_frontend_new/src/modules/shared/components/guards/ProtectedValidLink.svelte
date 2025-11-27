<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";
  import type { ValidLinkGuardConfig } from "./types";

  let {
    config,
    children,
  }: {
    config: ValidLinkGuardConfig;
    children: Snippet;
  } = $props();

  const context = getRouteGuardContext();

  const linkStore = $derived(
    context.linkDetailStore ||
      context.userLinkStore ||
      context.linkCreationStore,
  );

  const isLoading = $derived(
    linkStore && "query" in linkStore ? linkStore.query.isLoading : false,
  );

  const isValid = $derived(
    !linkStore
      ? false
      : context.linkCreationStore
        ? true
        : "link" in linkStore
          ? ("query" in linkStore && linkStore.query.isLoading
              ? false
              : linkStore.link !== null && linkStore.link !== undefined)
          : false,
  );

  const shouldRedirect = $derived(
    (linkStore && "query" in linkStore && !linkStore.query.isLoading && !linkStore.link) ||
    (context.authState.isReady && context.hasTempLinkLoadAttempted && !linkStore)
  );

  $effect(() => {
    if (shouldRedirect) {
      const redirectPath = config.redirectTo || "/404";
      // @ts-expect-error - dynamic route path
      goto(resolve(redirectPath));
    }
  });
</script>

{#if isLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if isValid}
  {@render children()}
{/if}
