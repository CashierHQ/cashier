<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import Preview from "../components/createLink/preview.svelte";
  import CreatedLink from "../components/createLink/createdLink.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import CreateLinkHeader from "../components/createLink/createLinkHeader.svelte";
  import ChooseLinkType from "../components/createLink/chooseLinkType.svelte";
  import AddAsset from "../components/createLink/addAsset.svelte";

  const { id }: { id: string } = $props();

  // load the temporary link data from localStorage
  const getTempLinkRes = LinkCreationStore.getTempLink(id);

  if (getTempLinkRes.isErr()) {
    goto(resolve("/app"));
  }

  const tempLink = getTempLinkRes.unwrap();

  if (!tempLink) {
    goto(resolve("/app"));
    throw new Error("Temporary link data not found");
  }

  let newLink = new LinkCreationStore(tempLink);
</script>

{#if !newLink}
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
