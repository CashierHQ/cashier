<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import ChooseLinkType from "$modules/creationLink/components/chooseLinkType.svelte";
  import CreateLinkHeader from "$modules/creationLink/components/createLinkHeader.svelte";
  import { CreationStoreChooseLinkTypeAdapter } from "$modules/creationLink/state/adapters/storeChooseLinkTypeAdapter";
  import { CreationStoreV3ChooseLinkTypeAdapter } from "$modules/creationLink/state/adapters/storeV3ChooseLinkTypeAdapter";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { onMount } from "svelte";

  const context = getGuardContext();
  const linkStore = $derived.by(() => {
    const storeV3 = context.linkCreationStoreV3;
    if (storeV3) {
      return new CreationStoreV3ChooseLinkTypeAdapter(storeV3);
    }
    const store = context.linkCreationStore;
    if (store) {
      return new CreationStoreChooseLinkTypeAdapter(store);
    }

    return null;
  });

  const handleBack = async () => {
    if (!linkStore) return;
    if (
      linkStore.step === LinkStep.CHOOSE_TYPE ||
      linkStore.step === LinkStep.CREATED
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
    <CreateLinkHeader linkStep={linkStore.step} onBack={handleBack} />
    {#if linkStore.step === LinkStep.CHOOSE_TYPE}
      <ChooseLinkType link={linkStore} />
      <!-- {:else if linkStore.step === LinkStep.ADD_ASSET}
      <AddAsset link={linkStore} />
    {:else if linkStore.step === LinkStep.PREVIEW}
      <Preview link={linkStore} />
    {:else if linkStore.step === LinkStep.CREATED}
      <CreatedLink link={linkStore} /> -->
    {/if}
  </div>
{/if}
