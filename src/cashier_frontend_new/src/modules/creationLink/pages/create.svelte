<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import AddAsset from "$modules/creationLink/components/addAsset.svelte";
  import ChooseLinkType from "$modules/creationLink/components/chooseLinkType.svelte";
  import CreatedLink from "$modules/creationLink/components/createdLink.svelte";
  import CreateLinkHeader from "$modules/creationLink/components/createLinkHeader.svelte";
  import Preview from "$modules/creationLink/components/preview.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { getGuardContext } from "$modules/guard/context.svelte";

  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";

  const { tempLinkId }: { tempLinkId: string } = $props();

  const context = getGuardContext();
  const linkStore = $derived.by(() => {
    const store = context.linkCreationStore;
    if (!store) return null;
    return store;
  });

  const handleBack = async () => {
    if (!linkStore) return;
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

{#if linkStore}
  <div class="grow-1 flex flex-col mt-2 sm:mt-0">
    <CreateLinkHeader link={linkStore} onBack={handleBack} />

    {#if linkStore.state.step === LinkStep.CHOOSE_TYPE}
      <ChooseLinkType link={linkStore} />
    {:else if linkStore.state.step === LinkStep.ADD_ASSET}
      <AddAsset link={linkStore} />
    {:else if linkStore.state.step === LinkStep.PREVIEW}
      <Preview link={linkStore} />
    {:else if linkStore.state.step === LinkStep.CREATED}
      <CreatedLink link={linkStore} />
    {/if}
  </div>
{/if}
