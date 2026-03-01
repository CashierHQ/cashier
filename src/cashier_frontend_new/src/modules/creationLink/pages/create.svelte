<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import AddAsset from "$modules/creationLink/components/addAsset.svelte";
  import ChooseLinkType from "$modules/creationLink/components/chooseLinkType.svelte";
  import CreatedLink from "$modules/creationLink/components/createdLink.svelte";
  import CreateLinkHeader from "$modules/creationLink/components/createLinkHeader.svelte";
  import Preview from "$modules/creationLink/components/preview.svelte";
  import { CreationStoreV3ViewModelAdapter } from "$modules/creationLink/state/adapters/storeV3ViewModelAdapter";
  import { CreationStoreViewModelAdapter } from "$modules/creationLink/state/adapters/storeViewModelAdapter";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
  import { DetailStoreV3ViewModelAdapter } from "$modules/detailLink/types/adapters/detailStoreV3ViewModelAdapter";
  import { DetailStoreViewModelAdapter } from "$modules/detailLink/types/adapters/detailStoreViewModelAdapter";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { onMount } from "svelte";

  const context = getGuardContext();
  const isV3 = $state(context.linkCreationStoreV3 !== null);
  const linkStore = $derived.by(() => {
    const storeV3 = context.linkCreationStoreV3;
    if (storeV3) {
      return new CreationStoreV3ViewModelAdapter(storeV3);
    }
    const store = context.linkCreationStore;
    if (store) {
      return new CreationStoreViewModelAdapter(store);
    }
    return null;
  });

  const linkStep = $derived.by(() => linkStore?.step ?? LinkStep.CHOOSE_TYPE);

  const detailStore = $derived.by(() => {
    if (!linkStore || !linkStore.id) return null;
    if (isV3) {
      const detailStoreV3 = new LinkDetailStoreV3({ id: linkStore.id });
      return new DetailStoreV3ViewModelAdapter(detailStoreV3);
    } else {
      const detailStore = new LinkDetailStore({ id: linkStore.id });
      return new DetailStoreViewModelAdapter(detailStore);
    }
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
    <CreateLinkHeader {linkStep} onBack={handleBack} />
    {#if linkStore.step === LinkStep.CHOOSE_TYPE}
      <ChooseLinkType link={linkStore} />
    {:else if linkStore.step === LinkStep.ADD_ASSET}
      <AddAsset link={linkStore} />
    {:else if linkStore.step === LinkStep.PREVIEW}
      <Preview link={linkStore} />
    {:else if linkStore.step === LinkStep.CREATED && linkStore.id && detailStore}
      <CreatedLink link={linkStore} {detailStore} />
    {/if}
  </div>
{/if}
