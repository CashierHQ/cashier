<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getGuardContext } from "../context.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";

  let {
    mustBeOwner = true,
    redirectTo = "/links",
    children,
  }: {
    mustBeOwner?: boolean;
    redirectTo?: string;
    children: Snippet;
  } = $props();

  const context = getGuardContext();

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
