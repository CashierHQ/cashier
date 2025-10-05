<script lang="ts">
  import AddAsset from "$modules/links/components/tiplink/addAsset.svelte";
  import createLinkState from "$modules/links/stores/create-link.svelte";
  import AddLinkDetail from "$modules/links/components/addLinkDetail.svelte";
  import Preview from "$modules/links/components/preview.svelte";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";

  // Local UI step state
  let step = $state(1); // 1: details, 2: asset, 3: preview

  // Read-only view of the create link data from the shared store
  const formData = createLinkState.createLinkData;

  function goPrev() {
    step = Math.max(1, step - 1);
  }

  // Submit the current create-link data to the backend
  async function submit() {
    try {
      const result = await cashierBackendService.createLink(formData);
      if (result.isOk()) {
        // creation succeeded — navigate or show success
        console.log("Link created:", result.unwrap());
        // advance or reset UI as appropriate
        step = 1;
      } else {
        console.error("Failed to create link:", result.unwrapErr());
      }
    } catch (e) {
      console.error("Unexpected error while creating link:", e);
    }
  }
</script>

<div class="min-h-screen flex justify-center">
  <div class="w-1/3 max-w-full px-4">
    <div class="space-y-6 p-4">
      <nav class="flex gap-2">
        <button
          class="px-3 py-1 rounded"
          onclick={() => (step = 1)}
          data-active={step === 1}
        >
          Details
        </button>
        <button
          class="px-3 py-1 rounded"
          onclick={() => (step = 2)}
          data-active={step === 2}
        >
          Asset
        </button>
        <button
          class="px-3 py-1 rounded"
          onclick={() => (step = 3)}
          data-active={step === 3}
        >
          Preview
        </button>
      </nav>

      {#if step === 1}
        <AddLinkDetail />
        <button
          class="px-4 py-2 rounded bg-primary text-white"
          onclick={() => (step = 2)}
        >
          Next
        </button>
      {:else if step === 2}
        <button class="px-4 py-2 rounded" onclick={goPrev}>Back</button>

        <AddAsset />
        <button
          class="px-4 py-2 rounded bg-primary text-white"
          onclick={() => (step = 3)}
        >
          Next
        </button>
      {:else}
        <Preview />

        <div class="flex gap-2 pt-4">
          <button class="px-4 py-2 rounded" onclick={goPrev}>Back</button>
          <button
            class="px-4 py-2 rounded bg-primary text-white"
            onclick={submit}
          >
            Submit
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
