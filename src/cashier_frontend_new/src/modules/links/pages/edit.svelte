<script lang="ts">
  import ChooseLinkType from "$modules/links/components/chooseLinkType.svelte";
  import Preview from "$modules/links/components/preview.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkStore } from "$modules/links/states/linkStore.svelte";
  import CreatedLink from "$modules/links/components/createdLink.svelte";
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
        <ChooseLinkType link={newLink} />
      {:else if newLink.state.step === LinkStep.ADD_ASSET}
        <AddAsset link={newLink} />
      {:else if newLink.state.step === LinkStep.PREVIEW}
        <Preview link={newLink} />
      {:else if newLink.state.step === LinkStep.CREATED}
        <CreatedLink link={newLink} />
      {/if}
    </div>
  </div>
</div>
