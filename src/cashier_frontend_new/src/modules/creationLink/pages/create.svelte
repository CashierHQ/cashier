<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import AddAsset from "../components/addAsset.svelte";
  import ChooseLinkType from "../components/chooseLinkType.svelte";
  import CreatedLink from "../components/createdLink.svelte";
  import CreateLinkHeader from "../components/createLinkHeader.svelte";
  import Preview from "../components/preview.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";

  const { linkStore }: { linkStore: LinkCreationStore } = $props();
</script>

<div class="grow-1 flex flex-col mt-2 sm:mt-0">
  <CreateLinkHeader link={linkStore} />

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
