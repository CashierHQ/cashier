<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { onMount } from "svelte";
  import AddAsset from "../components/addAsset.svelte";
  import ChooseLinkType from "../components/chooseLinkType.svelte";
  import CreatedLink from "../components/createdLink.svelte";
  import CreateLinkHeader from "../components/createLinkHeader.svelte";
  import Preview from "../components/preview.svelte";
  import { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import CreationFlowProtected from "../components/creationFlowProtected.svelte";

  const { id }: { id: string } = $props();
  let isLoading = $state(true);
  let createLinkStore = $state<LinkCreationStore | null>(null);

  async function handleBack() {
    if (!createLinkStore) return;

    if (createLinkStore.state.step === LinkStep.CHOOSE_TYPE) {
      goto(resolve("/links"));
    } else {
      try {
        await createLinkStore.goBack();
      } catch (e) {
        console.error("Failed to go back:", e);
      }
    }
  }

  onMount(() => {
    const getTempLinkRes = LinkCreationStore.getTempLink(id);

    if (getTempLinkRes.isErr()) {
      goto(resolve("/links"));
      return;
    }

    const tempLink = getTempLinkRes.unwrap();

    if (!tempLink) {
      goto(resolve("/links"));
      return;
    }

    createLinkStore = new LinkCreationStore(tempLink);
    appHeaderStore.setBackHandler(handleBack);
    isLoading = false;

    // Cleanup back handler on unmount
    return () => {
      appHeaderStore.clearBackHandler();
    };
  });
</script>

{#if isLoading}
  <div>Loading...</div>
{:else if !createLinkStore}
  <div>Link not found</div>
{:else}
  <CreationFlowProtected linkStore={createLinkStore}>
    <div class="grow-1 flex flex-col mt-2 sm:mt-0">
      <CreateLinkHeader link={createLinkStore} />

      {#if createLinkStore.state.step === LinkStep.CHOOSE_TYPE}
        <ChooseLinkType link={createLinkStore} />
      {:else if createLinkStore.state.step === LinkStep.ADD_ASSET}
        <AddAsset link={createLinkStore} />
      {:else if createLinkStore.state.step === LinkStep.PREVIEW}
        <Preview link={createLinkStore} />
      {:else if createLinkStore.state.step === LinkStep.CREATED}
        <CreatedLink link={createLinkStore} />
      {/if}
    </div>
  </CreationFlowProtected>
{/if}
