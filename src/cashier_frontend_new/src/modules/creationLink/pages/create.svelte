<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { onMount } from "svelte";
  import AddAsset from "../components/addAsset.svelte";
  import ChooseLinkType from "../components/chooseLinkType.svelte";
  import CreatedLink from "../components/createdLink.svelte";
  import CreateLinkHeader from "../components/createLinkHeader.svelte";
  import Preview from "../components/preview.svelte";
  import { LinkCreationStore } from "../state/linkCreationStore.svelte";

  const { id }: { id: string } = $props();
  let isLoading = $state(true);
  let newLink = $state<LinkCreationStore | null>(null);

  onMount(() => {
    // load the temporary link data from localStorage
    const getTempLinkRes = LinkCreationStore.getTempLink(id);

    if (getTempLinkRes.isErr()) {
      goto(resolve("/links"));
    }

    const tempLink = getTempLinkRes.unwrap();

    if (!tempLink) {
      goto(resolve("/links"));
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
  <div class="space-y-6 p-4">
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
