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

  const linkStore = $derived(context.getLinkStore());

  const isOwner = $derived(context.isOwner());

  const isLoading = $derived(context.isLoading({ checkTempLinkLoad: false }));

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
