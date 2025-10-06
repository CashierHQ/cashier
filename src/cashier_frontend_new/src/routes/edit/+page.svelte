<script lang="ts">
  import AddLinkDetail from "$modules/links/components/addLinkDetail.svelte";
  import LinkDetails from "$modules/links/components/linkDetails.svelte";
  import Preview from "$modules/links/components/preview.svelte";
  import AddAsset from "$modules/links/components/tiplink/addAsset.svelte";
  import { Link } from "$modules/links/state/linkStore.svelte";
  import { LinkStep } from "$modules/links/types";

  const newLink = new Link();
</script>

<div class="min-h-screen flex justify-center">
  <div class="w-1/3 max-w-full px-4">
    <div class="space-y-6 p-4">
      <nav class="flex gap-2">
        <button
          class="px-3 py-1 rounded"
          data-active={newLink.state.step === LinkStep.CHOOSE_TYPE}
        >
          Details
        </button>
        <button
          class="px-3 py-1 rounded"
          data-active={newLink.state.step === LinkStep.ADD_ASSET}
        >
          Asset
        </button>
        <button
          class="px-3 py-1 rounded"
          data-active={newLink.state.step === LinkStep.PREVIEW}
        >
          Preview
        </button>
      </nav>

      {#if newLink.state.step === LinkStep.CHOOSE_TYPE}
        <AddLinkDetail link={newLink} />
      {:else if newLink.state.step === LinkStep.ADD_ASSET}
        <AddAsset link={newLink} />
      {:else if newLink.state.step === LinkStep.PREVIEW}
        <Preview link={newLink} />
      {:else if newLink.state.step === LinkStep.CREATED}
        <LinkDetails link={newLink} />
      {/if}
    </div>
  </div>
</div>
