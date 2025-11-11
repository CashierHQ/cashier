<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkCreationStore } from "$modules/links/state/linkCreationStore.svelte";
  import AddAsset from "$modules/links/components/createLink/addAsset.svelte";
  import ChooseLinkType from "$modules/links/components/createLink/chooseLinkType.svelte";
  import Preview from "../components/createLink/preview.svelte";
  import CreateLinkHeader from "$modules/links/components/createLink/createLinkHeader.svelte";
  import CreatedLink from "../components/createLink/createdLink.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  const { id }: { id: string } = $props();

  // load the temporary link data from localStorage
  const tempLink = LinkCreationStore.getTempLink(id);

  if (!tempLink) {
    goto(resolve("/app"));
    // Add explicit return - this prevents TypeScript from continuing
    throw new Error("Redirecting: temp link not found");
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
