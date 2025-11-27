<script lang="ts">
  import { error } from "@sveltejs/kit";
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
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
    context.linkDetailStore || context.userLinkStore || context.linkCreationStore
  );

  const isLoading = $derived(
    linkStore && "query" in linkStore ? linkStore.query.isLoading : false
  );

  const link = $derived(
    linkStore && "link" in linkStore ? linkStore.link : null
  );

  $effect(() => {
    if (linkStore && "query" in linkStore && !linkStore.query.isLoading) {
      if (!link) {
        error(404, "Link not found");
      }
    }
  });
</script>

{#if isLoading}
  <div class="flex items-center justify-center p-8">Loading...</div>
{:else if link}
  {@render children()}
{:else}
  <div class="flex items-center justify-center p-8">Loading...</div>
{/if}
