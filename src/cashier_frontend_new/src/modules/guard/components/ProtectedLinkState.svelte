<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { Snippet } from "svelte";
  import { getGuardContext } from "../context.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkState } from "$modules/links/types/link/linkState";

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

  const currentStep = $derived.by(() => {
    if (!linkStore) return null;
    if (!("state" in linkStore)) return null;

    // For LinkDetailStore, wait for link to load before accessing state
    if (linkStore === context.linkDetailStore) {
      if (!context.linkDetailStore) return null;
      if (context.linkDetailStore.query.isLoading) return null;
      if (!context.linkDetailStore.link) return null;
    }

    try {
      return linkStore.state.step;
    } catch {
      // State getter might throw if link is missing
      return null;
    }
  });

  const isLoading = $derived.by(() => {
    if (linkStore && "query" in linkStore) {
      return linkStore.query.isLoading;
    }
    // For LinkCreationStore, check if temp link is still loading
    if (linkStore === context.linkCreationStore) {
      return !context.hasTempLinkLoadAttempted;
    }
    // If no store, check if temp link is still loading
    if (!linkStore && context.linkCreationStore === null) {
      return !context.hasTempLinkLoadAttempted;
    }
    return false;
  });

  const isStateValid = $derived.by(() => {
    const step = currentStep;

    // If LinkCreationStore has CREATED step, it's Transfer Pending - always allow
    if (linkStore === context.linkCreationStore && step === LinkStep.CREATED) {
      return true;
    }

    // If LinkDetailStore has link with CREATE_LINK state, it's Transfer Pending - always allow
    if (
      linkStore === context.linkDetailStore &&
      context.linkDetailStore?.link?.state === LinkState.CREATE_LINK &&
      step === LinkStep.CREATED
    ) {
      return true;
    }

    return step !== null && allowedStates.includes(step);
  });

  const shouldRedirect = $derived.by(() => {
    // Don't redirect while loading
    if (isLoading) return false;

    // Don't redirect if currentStep is null (still determining state)
    const step = currentStep;
    if (step === null) return false;

    // Special case: If link becomes ACTIVE on create page (Transfer Pending),
    // don't redirect to 404 - let the component handle the redirect to detail page
    const isCreatePage = page.url.pathname.startsWith("/link/create/");
    if (
      isCreatePage &&
      step === LinkStep.ACTIVE &&
      linkStore === context.linkDetailStore &&
      context.linkDetailStore?.link?.state === LinkState.ACTIVE
    ) {
      // This is Transfer Pending case where link just became ACTIVE on create page
      // Give component time to handle redirect (don't redirect to 404)
      return false;
    }

    // Only redirect if state is invalid
    const valid = isStateValid;
    return !valid;
  });

  $effect(() => {
    if (shouldRedirect) {
      goto(resolve("/404"));
    }
  });
</script>

{#if isLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if currentStep === null}
  <!-- Still determining state, wait a bit -->
  <ProtectionProcessingState message="Loading..." />
{:else if isStateValid}
  {@render children()}
{/if}
