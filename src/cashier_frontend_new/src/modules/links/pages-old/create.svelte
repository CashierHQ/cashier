<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkCreationStore } from "$modules/links/state/linkCreationStore.svelte";
  import AddAsset from "$modules/links/components-old/createLink/addAsset.svelte";
  import ChooseLinkType from "$modules/links/components-old/createLink/chooseLinkType.svelte";
  import Preview from "../components-old/createLink/preview.svelte";
  import CreateLinkHeader from "$modules/links/components-old/createLink/createLinkHeader.svelte";
  import CreatedLink from "../components-old/createLink/createdLink.svelte";

  let newLink = new LinkCreationStore();
</script>

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
