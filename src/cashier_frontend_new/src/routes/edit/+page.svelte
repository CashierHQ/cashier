<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import AddLinkDetail from "$modules/links/components/addLinkDetail.svelte";
  import Preview from "$modules/links/components/preview.svelte";
  import AddAsset from "$modules/links/components/tiplink/addAsset.svelte";
  import createLinkState from "$modules/links/state/create-link.svelte";
  import { Link, LinkStep } from "$modules/links/state/linkStore.svelte";

  // Local UI step state
  let step = $state(1); // 1: details, 2: asset, 3: preview
  const newLink = new Link();

  function goBack() {
    newLink.goBack();
  }

  function goNext() {
    newLink.goNext();
  }

  // Submit via shared createLinkState
  async function submit() {
    const res = await createLinkState.createLink();
    if (res.isOk()) {
      console.log("Link created:", res.value);
      alert("link created: " + res.value.id);
    } else {
      console.error("Failed to create link:", res.error);
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

      {#if newLink.getState().step === LinkStep.CHOOSE_TYPE}
        <button
          class="px-4 py-2 rounded"
          onclick={() => {
            goto(resolve("/"));
          }}>Back</button
        >

        <AddLinkDetail />
        <button
          class="px-4 py-2 rounded bg-primary text-white"
          onclick={goNext}
        >
          Next
        </button>
      {:else if newLink.getState().step === LinkStep.ADD_ASSET}
        <button class="px-4 py-2 rounded" onclick={goBack}>Back</button>

        <AddAsset />
        <button
          class="px-4 py-2 rounded bg-primary text-white"
          onclick={goNext}
        >
          Next
        </button>
      {:else}
        <Preview />

        <div class="flex gap-2 pt-4">
          <button class="px-4 py-2 rounded" onclick={goBack}>Back</button>
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
