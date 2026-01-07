<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkState } from "$modules/links/types/link/linkState";
  import AddAsset from "../components/addAsset.svelte";
  import ChooseLinkType from "../components/chooseLinkType.svelte";
  import CreatedLink from "$modules/shared/components/CreatedLink.svelte";
  import CreateLinkHeader from "../components/createLinkHeader.svelte";
  import Preview from "../components/preview.svelte";
  import { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import ProtectionProcessingState from "$modules/guard/components/ProtectionProcessingState.svelte";

  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";

  const { tempLinkId }: { tempLinkId: string } = $props();

  const context = getGuardContext();

  // Try to get LinkCreationStore from context first (for Transfer Pending)
  // Otherwise, try to load from temp link
  let linkStore = $state<LinkCreationStore | null>(null);

  $effect(() => {
    if (context.linkCreationStore) {
      linkStore = context.linkCreationStore;
    } else {
      const tempLinkResult = LinkCreationStore.getTempLink(tempLinkId);
      if (tempLinkResult.isOk()) {
        linkStore = new LinkCreationStore(tempLinkResult.value);
      } else {
        // Temp link not found - might be Transfer Pending
        // LinkDetailStore should be loaded by RouteGuard in this case
        linkStore = null;
      }
    }
  });

  const handleBack = async () => {
    if (!linkStore) {
      goto(resolve("/links"));
      return;
    }

    if (
      linkStore.state.step === LinkStep.CHOOSE_TYPE ||
      linkStore.state.step === LinkStep.CREATED
    ) {
      goto(resolve("/links"));
    } else {
      try {
        await linkStore.goBack();
      } catch (e) {
        console.error("Failed to go back:", e);
      }
    }
  };

  onMount(() => {
    appHeaderStore.setBackHandler(handleBack);

    return () => {
      appHeaderStore.clearBackHandler();
    };
  });
</script>

{#if !linkStore}
  <!-- Transfer Pending with LinkDetailStore or still loading -->
  {#if context.linkDetailStore && context.linkDetailStore.link?.state === LinkState.CREATE_LINK}
    <!-- Transfer Pending - show CreatedLink using LinkDetailStore -->
    <div class="grow-1 flex flex-col mt-2 sm:mt-0">
      <CreatedLink link={context.linkDetailStore} />
    </div>
  {:else}
    <!-- Still loading -->
    <ProtectionProcessingState message="Loading..." />
  {/if}
{:else}
  <div class="grow-1 flex flex-col mt-2 sm:mt-0">
    <CreateLinkHeader link={linkStore} onBack={handleBack} />

    {#if linkStore.state.step === LinkStep.CHOOSE_TYPE}
      <ChooseLinkType link={linkStore} />
    {:else if linkStore.state.step === LinkStep.ADD_ASSET}
      <AddAsset link={linkStore} />
    {:else if linkStore.state.step === LinkStep.PREVIEW}
      <Preview link={linkStore} />
    {:else if linkStore.state.step === LinkStep.CREATED || linkStore.link?.state === LinkState.CREATE_LINK}
      <CreatedLink link={linkStore} />
    {/if}
  </div>
{/if}
