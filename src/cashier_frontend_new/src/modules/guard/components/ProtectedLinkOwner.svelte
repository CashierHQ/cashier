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

  const linkStore = $derived.by(() => {
    return context.getLinkStore();
  });

  const isOwner = $derived.by(() => {
    return context.isOwner();
  });

  const isLoading = $derived.by(() => {
    return context.isLoading({ checkTempLinkLoad: false });
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
