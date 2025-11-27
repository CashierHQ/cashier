<script lang="ts">
  import { error } from "@sveltejs/kit";
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import type { LinkStateGuardConfig } from "./types";

  let {
    config,
    children,
  }: {
    config: LinkStateGuardConfig;
    children: Snippet;
  } = $props();

  const context = getRouteGuardContext();

  const allStates = [
    LinkStep.CHOOSE_TYPE,
    LinkStep.ADD_ASSET,
    LinkStep.PREVIEW,
    LinkStep.CREATED,
    LinkStep.ACTIVE,
    LinkStep.INACTIVE,
    LinkStep.ENDED,
  ];

  const allowedStates = config.allowedStates ?? allStates;

  const linkStore = $derived(
    context.linkDetailStore || context.linkCreationStore
  );

  const currentStep = $derived(
    linkStore && "state" in linkStore ? linkStore.state.step : null
  );

  const isLoading = $derived(
    linkStore && "query" in linkStore ? linkStore.query.isLoading : false
  );

  const isStateValid = $derived(
    currentStep !== null && allowedStates.includes(currentStep)
  );

  $effect(() => {
    if (linkStore && "query" in linkStore && !linkStore.query.isLoading) {
      if (!isStateValid) {
        error(404, "Invalid link state");
      }
    } else if (linkStore && !("query" in linkStore)) {
      if (!isStateValid) {
        error(404, "Invalid link state");
      }
    }
  });
</script>

{#if isLoading}
  <div class="flex items-center justify-center p-8">Loading...</div>
{:else if isStateValid}
  {@render children()}
{:else}
  <div class="flex items-center justify-center p-8">Loading...</div>
{/if}

