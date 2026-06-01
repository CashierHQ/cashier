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
  import type { AddAssetVM } from "$modules/creationLink/types/viewModels/addAssetVM";
  import type { ChooseLinkTypeVM } from "$modules/creationLink/types/viewModels/chooseLinkTypeVM";
  import type { GenericCreationLinkStoreVM } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
  import { DetailStoreV3ViewModelAdapter } from "$modules/detailLink/state/adapters/detailStoreV3ViewModelAdapter";
  import { DetailStoreViewModelAdapter } from "$modules/detailLink/state/adapters/detailStoreViewModelAdapter";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
  import type { GenericDetailStoreVM } from "$modules/detailLink/types/genericDetailStoreVM";
  import LockTransaction from "$modules/gating/components/LockTransaction.svelte";
  import { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { onMount } from "svelte";

  const context = getGuardContext();
  const isV3 = $derived.by(() => !!context.linkCreationStoreV3);
  const fallbackGatingStore = new GatingStore();
  const gatingStore = $derived.by(
    () => context.gatingStore ?? fallbackGatingStore,
  );

  let cachedCreationStore:
    | (GenericCreationLinkStoreVM & ChooseLinkTypeVM & AddAssetVM)
    | null = null;
  const linkStore = $derived.by<
    (GenericCreationLinkStoreVM & ChooseLinkTypeVM & AddAssetVM) | null
  >(() => {
    const storeV3 = context.linkCreationStoreV3;
    if (isV3 && storeV3) {
      if (!cachedCreationStore) {
        cachedCreationStore = new CreationStoreV3ViewModelAdapter(storeV3);
      }
      return cachedCreationStore;
    }
    const store = context.linkCreationStore;
    if (store) {
      if (!cachedCreationStore) {
        cachedCreationStore = new CreationStoreViewModelAdapter(store);
      }
      return cachedCreationStore;
    }
    return null;
  });

  const linkStep = $derived.by(() => linkStore?.step ?? LinkStep.CHOOSE_TYPE);
  const linkTitle = $derived.by(() => linkStore?.createLinkData.title ?? "");

  let cachedDetailStoreKey: string | null = null;
  let cachedDetailStore: GenericDetailStoreVM | null = null;
  const detailStore = $derived.by<GenericDetailStoreVM | null>(() => {
    const backendId = linkStore?.backendId;
    if (!backendId) return null;

    const detailStoreKey = `${isV3 ? "v3" : "v2"}:${backendId}`;
    if (cachedDetailStoreKey === detailStoreKey && cachedDetailStore) {
      return cachedDetailStore;
    }

    if (isV3) {
      const detailStoreV3 = new LinkDetailStoreV3({ id: backendId });
      cachedDetailStore = new DetailStoreV3ViewModelAdapter(detailStoreV3);
    } else {
      const detailStoreV2 = new LinkDetailStore({ id: backendId });
      cachedDetailStore = new DetailStoreViewModelAdapter(detailStoreV2);
    }
    cachedDetailStoreKey = detailStoreKey;
    return cachedDetailStore;
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
    <CreateLinkHeader
      {linkStep}
      {linkTitle}
      showLockStep={isV3}
      onBack={handleBack}
    />
    {#if linkStore.step === LinkStep.CHOOSE_TYPE}
      <ChooseLinkType link={linkStore} />
    {:else if linkStore.step === LinkStep.ADD_ASSET}
      <AddAsset link={linkStore} />
    {:else if linkStore.step === LinkStep.LOCK}
      <LockTransaction link={linkStore} store={gatingStore} />
    {:else if linkStore.step === LinkStep.PREVIEW}
      <Preview link={linkStore} {gatingStore} />
    {:else if linkStore.step === LinkStep.CREATED && linkStore.id && detailStore}
      <CreatedLink link={linkStore} {detailStore} />
    {/if}
  </div>
{/if}
