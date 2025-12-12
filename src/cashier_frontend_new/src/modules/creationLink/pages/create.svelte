<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import AddAsset from "../components/addAsset.svelte";
  import ChooseLinkType from "../components/chooseLinkType.svelte";
  import CreatedLink from "../components/createdLink.svelte";
  import CreateLinkHeader from "../components/createLinkHeader.svelte";
  import Preview from "../components/preview.svelte";
  import { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";

  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";

  const { tempLinkId }: { tempLinkId: string } = $props();

  const tempLinkResult = LinkCreationStore.getTempLink(tempLinkId);
  if (!tempLinkResult.isOk()) {
    throw new Error(`Temp link not found: ${tempLinkId}`);
  }
  const linkStore = new LinkCreationStore(tempLinkResult.value);

  const handleBack = async () => {
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
