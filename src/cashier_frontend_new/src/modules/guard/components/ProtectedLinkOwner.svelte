<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import type { Snippet } from "svelte";
  import ProtectionProcessingState from "$modules/guard/components/ProtectionProcessingState.svelte";

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

  const linkStore = $derived.by(() => context.getLinkStore());

  const isOwner = $derived.by(() => context.isOwner());

  const isLoading = $derived.by(() =>
    context.isLoading({ checkTempLinkLoad: false }),
  );

  const isReady = $derived(
    !context.authState.isReady || !linkStore
      ? false
      : context.linkCreationStore
        ? true
        : !isLoading,
  );

  const shouldShow = $derived(isReady && (mustBeOwner ? isOwner : !isOwner));

  let hasRenderedAllowed = $state(false);

  $effect(() => {
    // Mark as rendered only when we actually show children.
    if (shouldShow) {
      hasRenderedAllowed = true;
    }
  });

  const shouldShowLoading = $derived(isLoading && !hasRenderedAllowed);

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

{#if shouldShow || (hasRenderedAllowed && isLoading)}
  {@render children()}
{:else if shouldShowLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if isReady}
  <ProtectionProcessingState message="Redirecting..." />
{/if}
