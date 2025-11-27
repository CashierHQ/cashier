<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import type { LinkOwnerGuardConfig } from "./types";

  let {
    config,
    children,
  }: {
    config: LinkOwnerGuardConfig;
    children: Snippet;
  } = $props();

  const context = getRouteGuardContext();
  const mustBeOwner = config.mustBeOwner ?? true;
  const redirectTo = config.redirectTo ?? "/links";

  const linkStore = $derived(
    context.linkDetailStore || context.userLinkStore || context.linkCreationStore
  );

  const link = $derived(
    linkStore && "link" in linkStore ? linkStore.link : null
  );

  const isOwner = $derived(
    link?.creator != null &&
      context.authState.account?.owner != null &&
      link.creator.toString() === context.authState.account.owner
  );

  const isReady = $derived(
    context.authState.isReady &&
      linkStore &&
      "query" in linkStore &&
      !linkStore.query.isLoading
  );

  const shouldShow = $derived(
    isReady && (mustBeOwner ? isOwner : !isOwner)
  );

  $effect(() => {
    if (isReady) {
      if (mustBeOwner && !isOwner) {
        goto(redirectTo);
      } else if (!mustBeOwner && isOwner) {
        goto(redirectTo);
      }
    }
  });
</script>

{#if shouldShow}
  {@render children()}
{:else if isReady}
  <div class="flex items-center justify-center p-8">Redirecting...</div>
{:else}
  <div class="flex items-center justify-center p-8">Loading...</div>
{/if}

