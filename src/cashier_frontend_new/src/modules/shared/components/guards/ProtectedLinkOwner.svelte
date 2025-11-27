<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";
  import type { LinkOwnerGuardConfig } from "../../types/guards";

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
    context.linkDetailStore ||
      context.userLinkStore ||
      context.linkCreationStore,
  );

  const link = $derived(
    !linkStore
      ? null
      : "link" in linkStore
        ? linkStore.link
        : "linkDetail" in linkStore && linkStore.linkDetail
          ? linkStore.linkDetail.link
          : null,
  );

  const isOwner = $derived(
    context.linkCreationStore
      ? true
      : link?.creator != null &&
          context.authState.account?.owner != null &&
          link.creator.toString() === context.authState.account.owner,
  );

  const isLoading = $derived(
    !linkStore
      ? false
      : "query" in linkStore
        ? linkStore.query.isLoading
        : "linkDetail" in linkStore && linkStore.linkDetail?.query
          ? linkStore.linkDetail.query.isLoading
          : false,
  );

  const isReady = $derived(
    !context.authState.isReady || !linkStore
      ? false
      : context.linkCreationStore
        ? true
        : !isLoading,
  );

  const shouldShow = $derived(isReady && (mustBeOwner ? isOwner : !isOwner));

  $effect(() => {
    if (isReady) {
      if (mustBeOwner && !isOwner) {
        // @ts-expect-error - dynamic route path
        goto(resolve(redirectTo));
      } else if (!mustBeOwner && isOwner) {
        // @ts-expect-error - dynamic route path
        goto(resolve(redirectTo));
      }
    }
  });
</script>

{#if shouldShow}
  {@render children()}
{:else if isReady}
  <ProtectionProcessingState message="Redirecting..." />
{/if}
