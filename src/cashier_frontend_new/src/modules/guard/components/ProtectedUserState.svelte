<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import type { Snippet } from "svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";

  const allStates = [
    UserLinkStep.LANDING,
    UserLinkStep.ADDRESS_UNLOCKED,
    UserLinkStep.ADDRESS_LOCKED,
    UserLinkStep.GATE,
    UserLinkStep.COMPLETED,
  ];

  let {
    allowedStates = allStates,
    children,
  }: {
    allowedStates?: UserLinkStep[];
    children: Snippet;
  } = $props();

  const context = getGuardContext();

  const userLinkStore = $derived(
    context.userLinkStoreV3 || context.userLinkStore,
  );

  const currentStep = $derived(
    userLinkStore && "step" in userLinkStore ? userLinkStore.step : null,
  );

  const isLoading = $derived(
    userLinkStore && "isLoading" in userLinkStore
      ? userLinkStore.isLoading
      : false,
  );

  const isStateValid = $derived(
    currentStep !== null && allowedStates.includes(currentStep),
  );

  const shouldRedirect = $derived(userLinkStore && !isLoading && !isStateValid);

  let hasRenderedValidState = $state(false);

  $effect(() => {
    if (isStateValid) {
      hasRenderedValidState = true;
    }
  });

  const shouldShowLoading = $derived(
    isLoading && currentStep === null && !hasRenderedValidState,
  );

  $effect(() => {
    if (shouldRedirect) {
      goto(resolve("/404"));
    }
  });
</script>

{#if shouldShowLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if isStateValid || (hasRenderedValidState && isLoading)}
  {@render children()}
{/if}
