<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { onMount, setContext } from "svelte";
  import AddAsset from "../components/addAsset.svelte";
  import ChooseLinkType from "../components/chooseLinkType.svelte";
  import CreatedLink from "../components/createdLink.svelte";
  import CreateLinkHeader from "../components/createLinkHeader.svelte";
  import Preview from "../components/preview.svelte";
  import { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { LINK_BACK_CONTEXT_KEY } from "../context/linkBackContext";

  const { id }: { id: string } = $props();
  let isLoading = $state(true);
  let newLink = $state<LinkCreationStore | null>(null);

  async function handleBack() {
    if (!newLink) return;

    const step = newLink.state?.step;

    // On first step, navigate back to /links
    if (step === LinkStep.CHOOSE_TYPE) {
      goto(resolve("/links"));
      return;
    }

    try {
      await newLink.goBack();
    } catch (e) {
      console.error("Failed to go back:", e);
    }
  }

  setContext(LINK_BACK_CONTEXT_KEY, handleBack);

  $effect(() => {
    if (newLink) {
      setContext(LINK_BACK_CONTEXT_KEY, handleBack);
    }
  });

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

    newLink = new LinkCreationStore(tempLink);
    isLoading = false;
  });
</script>

{#if isLoading}
  <div>Loading...</div>
{:else if !newLink}
  <div>Link not found</div>
{:else}
  <div class="grow-1 flex flex-col mt-2 sm:mt-0">
    <CreateLinkHeader link={newLink} />

    {#if newLink.state.step === LinkStep.CHOOSE_TYPE}
      <ChooseLinkType link={newLink} />
    {:else if newLink.state.step === LinkStep.ADD_ASSET}
      <AddAsset link={newLink} />
    {:else if newLink.state.step === LinkStep.PREVIEW}
      <Preview link={newLink} />
    {:else if newLink.state.step === LinkStep.CREATED}
      <CreatedLink link={newLink} />
    {/if}
  </div>
{/if}
