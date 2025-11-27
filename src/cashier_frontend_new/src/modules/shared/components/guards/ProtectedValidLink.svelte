<script lang="ts">
  import { error } from "@sveltejs/kit";
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
        : "link" in linkStore && linkStore.link
          ? true
          : false,
  );

  $effect(() => {
    console.log("[ProtectedValidLink]", {
      linkStore,
      linkCreationStore: context.linkCreationStore,
      isLoading,
      isValid,
    });
  });

  $effect(() => {
    if (linkStore && "query" in linkStore && !linkStore.query.isLoading) {
      if (!linkStore.link) {
        if (config.redirectTo) {
          // @ts-expect-error - dynamic route path
          goto(resolve(config.redirectTo));
        } else {
          error(404, "Link not found");
        }
      }
    }
  });
</script>

{#if isLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if isValid}
  {@render children()}
{:else}
  <ProtectionProcessingState message="Loading..." />
{/if}
