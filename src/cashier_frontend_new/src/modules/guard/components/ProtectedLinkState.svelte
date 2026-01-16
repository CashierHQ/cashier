<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";

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
