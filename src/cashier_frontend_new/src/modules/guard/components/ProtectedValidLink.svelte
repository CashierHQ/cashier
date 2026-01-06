<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getGuardContext } from "../context.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";

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
    context.isLoading({ checkTempLinkLoad: true }),
  );

  const hasLink = $derived(() => context.hasLink());

  const isValid = $derived(!linkStore ? false : isLoading ? false : hasLink);

  const isReadyToCheck = $derived(!isLoading && linkStore !== null);

  const shouldRedirect = $derived(
    (isReadyToCheck && !hasLink) ||
      (context.authState.isReady &&
        context.hasTempLinkLoadAttempted &&
        !linkStore),
  );

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
