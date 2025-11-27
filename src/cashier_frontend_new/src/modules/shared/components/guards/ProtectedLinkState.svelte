<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import type { LinkStateGuardConfig } from "../../types/guards";

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
    context.linkDetailStore || context.linkCreationStore,
  );

  const currentStep = $derived(
    linkStore && "state" in linkStore ? linkStore.state.step : null,
  );

  const isLoading = $derived(
    linkStore && "query" in linkStore ? linkStore.query.isLoading : false,
  );

  const isStateValid = $derived(
    currentStep !== null && allowedStates.includes(currentStep),
  );

  const shouldRedirect = $derived(
    (linkStore &&
      "query" in linkStore &&
      !linkStore.query.isLoading &&
      !isStateValid) ||
      (linkStore && !("query" in linkStore) && !isStateValid),
  );

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
