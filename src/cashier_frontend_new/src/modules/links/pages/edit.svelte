<script lang="ts">
  import AddLinkDetail from "$modules/links/components/addLinkDetail.svelte";
  import Preview from "$modules/links/components/preview.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkStore } from "$modules/links/stores/linkStore.svelte";
  import CreateLink from "$modules/links/components/createLink.svelte";
  import AddAsset from "$modules/links/components/addAsset.svelte";

  const newLink = new LinkStore();
</script>

<div class="min-h-screen flex justify-center">
  <div class="w-1/3 max-w-full px-4">
    <div class="space-y-6 p-4">
      <nav class="flex gap-2">
        <button
          class="px-3 py-1 rounded"
          class:font-semibold={newLink.state.step === LinkStep.CHOOSE_TYPE}
          aria-pressed={newLink.state.step === LinkStep.CHOOSE_TYPE}
        >
          Choose Type
        </button>
        <button
          class="px-3 py-1 rounded"
          class:font-semibold={newLink.state.step === LinkStep.ADD_ASSET}
          aria-pressed={newLink.state.step === LinkStep.ADD_ASSET}
        >
          Asset
        </button>
        <button
          class="px-3 py-1 rounded"
          class:font-semibold={newLink.state.step === LinkStep.PREVIEW ||
            newLink.state.step === LinkStep.CREATED}
          aria-pressed={newLink.state.step === LinkStep.PREVIEW ||
            newLink.state.step === LinkStep.CREATED}
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
        <CreateLink link={newLink} />
      {/if}
    </div>
  </div>
</div>
