<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import AddAsset from "../components/addAsset.svelte";
  import ChooseLinkType from "../components/chooseLinkType.svelte";
  import CreatedLink from "../components/createdLink.svelte";
  import CreateLinkHeader from "../components/createLinkHeader.svelte";
  import Preview from "../components/preview.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";

  const { linkStore }: { linkStore: LinkCreationStore } = $props();

  const handleBack = async () => {
    const backHandler = appHeaderStore.getBackHandler();
    if (backHandler) {
      await backHandler();
    } else {
      await linkStore.goBack();
    }
  };
</script>

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
