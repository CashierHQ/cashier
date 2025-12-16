<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getGuardContext } from "../context.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";
  import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";

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

  type CombinedStore = LinkDetailStore | UserLinkStore | LinkCreationStore;

  const linkStore = $derived.by<CombinedStore | null>(() => {
    return (
      context.linkDetailStore ||
      context.userLinkStore ||
      context.linkCreationStore ||
      null
    );
  });

  const link = $derived.by(() => {
    if (!linkStore) return null;
    if ("link" in linkStore && linkStore.link) {
      return linkStore.link;
    }
    if ("linkDetail" in linkStore && linkStore.linkDetail?.link) {
      return linkStore.linkDetail.link;
    }
    return null;
  });

  const isOwner = $derived.by(() => {
    if (context.linkCreationStore) {
      return true;
    }
    return (
      link?.creator != null &&
      context.authState.account?.owner != null &&
      link.creator.toString() === context.authState.account.owner
    );
  });

  const isLoading = $derived.by(() => {
    if (!linkStore) return false;
    if ("query" in linkStore && linkStore.query) {
      return linkStore.query.isLoading;
    }
    if ("linkDetail" in linkStore && linkStore.linkDetail?.query) {
      return linkStore.linkDetail.query.isLoading;
    }
    return false;
  });

  const isReady = $derived.by(() => {
    if (!context.authState.isReady || !linkStore) {
      return false;
    }
    if (context.linkCreationStore) {
      return true;
    }
    return !isLoading;
  });

  const shouldShow = $derived.by(() => {
    if (!isReady) {
      return false;
    }
    return mustBeOwner ? isOwner : !isOwner;
  });

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
