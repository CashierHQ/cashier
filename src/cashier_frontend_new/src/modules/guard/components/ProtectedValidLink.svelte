<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getGuardContext } from "../context.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";
  import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";

  let {
    redirectTo,
    children,
  }: {
    redirectTo?: string;
    children: Snippet;
  } = $props();

  const context = getGuardContext();

  const linkStore = $derived.by(() => {
    return context.getLinkStore()
  });

  const isLoading = $derived.by(() => {
    return context.isLoading({ checkTempLinkLoad: true });
  });

  const hasLink = $derived.by(() => {
    if (!linkStore) return false;
    if (context.linkCreationStore) return true;
    // Check UserLinkStore first (has linkDetail)
    if ("linkDetail" in linkStore) {
      const store = linkStore as UserLinkStore;
      return (
        store.linkDetail?.link !== null && store.linkDetail?.link !== undefined
      );
    }
    // LinkDetailStore and LinkCreationStore both have link
    if ("link" in linkStore) {
      return linkStore.link !== null && linkStore.link !== undefined;
    }
    return false;
  });

  const isValid = $derived.by(() => {
    if (!linkStore) return false;
    if (isLoading) return false;
    return hasLink;
  });

  const isReadyToCheck = $derived.by(() => {
    return !isLoading && linkStore !== null;
  });

  const shouldRedirect = $derived.by(() => {
    // Ready to check and no valid link found
    if (isReadyToCheck && !hasLink) {
      return true;
    }

    // Auth is ready, temp link load attempted, but no store exists
    const tempLinkLoadFailed =
      context.authState.isReady &&
      context.hasTempLinkLoadAttempted &&
      !linkStore;

    return tempLinkLoadFailed;
  });

  $effect(() => {
    if (shouldRedirect) {
      const redirectPath = redirectTo || "/404";
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
