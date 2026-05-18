<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import type { Snippet } from "svelte";
  import ProtectionProcessingState from "$modules/guard/components/ProtectionProcessingState.svelte";

  const allStates = [
    LinkStep.CHOOSE_TYPE,
    LinkStep.ADD_ASSET,
    LinkStep.PREVIEW,
    LinkStep.CREATED,
    LinkStep.ACTIVE,
    LinkStep.INACTIVE,
    LinkStep.ENDED,
  ];

  let {
    allowedStates = allStates,
    children,
  }: {
    allowedStates?: LinkStep[];
    children: Snippet;
  } = $props();

  const context = getGuardContext();

  const linkStore = $derived(
    context.linkDetailStoreV3 ||
      context.linkDetailStore ||
      context.linkCreationStore ||
      context.linkCreationStoreV3,
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

  let hasRenderedValidState = $state(false);

  $effect(() => {
    // Mark as rendered only when we actually show children (i.e. not during initial loading).
    if (isStateValid && !isLoading) {
      hasRenderedValidState = true;
    }
  });

  const shouldShowLoading = $derived(isLoading && !hasRenderedValidState);

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

{#if shouldShowLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if isStateValid || (hasRenderedValidState && isLoading)}
  {@render children()}
{/if}
