<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkStore } from "$modules/links/state/linkStore.svelte";
  import AddAsset from "$modules/links/components/createLink/addAsset.svelte";
  import ChooseLinkType from "$modules/links/components/createLink/chooseLinkType.svelte";
  import Preview from "../components/createLink/preview.svelte";
  import CreatedLink from "../components/createLink/createdLink.svelte";
  import ActionDrawer from "$modules/shared/components/ActionDrawer.svelte";
  import { actionDrawerState } from "$modules/shared/state/actionDrawerState.svelte";

  const newLink = new LinkStore();

  // Watch for link action changes and show drawer
  $effect(() => {
    if (newLink.action) {
      actionDrawerState.open(newLink.action);
    }
  });

  function handleDrawerClose() {
    actionDrawerState.close();
  }
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

<!-- Action Drawer -->
<!-- ActionDrawer is mounted globally in layout -->
