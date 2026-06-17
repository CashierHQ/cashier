<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import type { Snippet } from "svelte";
  import ProtectionProcessingState from "$modules/guard/components/ProtectionProcessingState.svelte";

  let {
    redirectTo,
    children,
  }: {
    redirectTo?: string;
    children: Snippet;
  } = $props();

  const context = getGuardContext();

  const linkStore = $derived.by(() => context.getLinkStore());

  const isLoading = $derived.by(() =>
    context.isLoading({ checkDraftLinkLoad: true }),
  );

  const hasLink = $derived.by(() => context.hasLink());

  const isValid = $derived(!linkStore ? false : isLoading ? false : hasLink);

  const isReadyToCheck = $derived(!isLoading && linkStore !== null);

  const shouldRedirect = $derived(
    (isReadyToCheck && !hasLink) ||
      (context.authState.isReady &&
        context.hasDraftLinkLoadAttempted &&
        !linkStore),
  );

  let hasRenderedValidLink = $state(false);

  $effect(() => {
    if (isValid) {
      hasRenderedValidLink = true;
    }
  });

  const shouldShowLoading = $derived(
    isLoading && !hasLink && !hasRenderedValidLink,
  );

  $effect(() => {
    if (shouldRedirect) {
      const redirectPath = redirectTo || "/404";
      // @ts-expect-error - dynamic route path
      goto(resolve(redirectPath));
    }
  });
</script>

{#if shouldShowLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if isValid || (hasRenderedValidLink && isLoading)}
  {@render children()}
{/if}
