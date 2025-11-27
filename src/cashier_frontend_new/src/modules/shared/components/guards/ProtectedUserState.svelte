<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import type { UserStateGuardConfig } from "./types";

  let {
    config,
    children,
  }: {
    config: UserStateGuardConfig;
    children: Snippet;
  } = $props();

  const context = getRouteGuardContext();

  const allStates = [
    UserLinkStep.LANDING,
    UserLinkStep.ADDRESS_UNLOCKED,
    UserLinkStep.ADDRESS_LOCKED,
    UserLinkStep.GATE,
    UserLinkStep.COMPLETED,
  ];

  const allowedStates = config.allowedStates ?? allStates;

  const userLinkStore = $derived(context.userLinkStore);

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

  $effect(() => {
    if (shouldRedirect) {
      goto(resolve("/404"));
    }
  });
</script>

{#if isLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if isStateValid}
  {@render children()}
{/if}
