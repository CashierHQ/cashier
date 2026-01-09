<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkState } from "$modules/links/types/link/linkState";
  import AddAsset from "$modules/creationLink/components/addAsset.svelte";
  import ChooseLinkType from "$modules/creationLink/components/chooseLinkType.svelte";
  import CreatedLink from "$modules/shared/components/CreatedLink.svelte";
  import CreateLinkHeader from "$modules/creationLink/components/createLinkHeader.svelte";
  import Preview from "$modules/creationLink/components/preview.svelte";
  import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import ProtectionProcessingState from "$modules/guard/components/ProtectionProcessingState.svelte";

  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";

  const { tempLinkId }: { tempLinkId: string } = $props();

  const context = getGuardContext();

  // Try to get LinkCreationStore from context first
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
        // Temp link not found - if the link is in Transfer Pending state,
        // we redirect to detail flow, so this logic is unnecessary
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
  <!-- Still loading or temp link not found -->
  <ProtectionProcessingState message="Loading..." />
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
      <CreatedLink linkId={linkStore.id ?? ""} action={linkStore.action} />
    {/if}
  </div>
{/if}
