<script lang="ts">
  import { error } from "@sveltejs/kit";
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

  $effect(() => {
    if (userLinkStore && !isLoading) {
      if (!isStateValid) {
        error(404, "Invalid user state");
      }
    }
  });
</script>

{#if isLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if isStateValid}
  {@render children()}
{:else}
  <ProtectionProcessingState message="Loading..." />
{/if}
