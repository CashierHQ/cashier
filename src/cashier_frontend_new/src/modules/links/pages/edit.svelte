<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkStore } from "$modules/links/state/linkStore.svelte";
  import AddAsset from "$modules/links/components/createLink/addAsset.svelte";
  import ChooseLinkType from "$modules/links/components/createLink/chooseLinkType.svelte";
  import Preview from "../components/createLink/preview.svelte";
  import CreatedLink from "../components/createLink/createdLink.svelte";

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
