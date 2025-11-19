<script lang="ts">
  import type UserLinkStore from "$modules/useLink/state/userLinkStore.svelte";

  const { userLink }: { userLink: UserLinkStore } = $props();
  // checkbox state: user must check to enable "Next"
  let openGate = $state(false);
</script>

<div class="p-4 border rounded">
  <h2 class="text-lg font-semibold">Gate</h2>
  <p class="text-sm text-gray-600">
    A gate step is shown here — typically user needs to perform an action to
    open it.
  </p>

  <div class="mt-4">
    <label class="inline-flex items-center gap-2">
      <input
        type="checkbox"
        bind:checked={openGate}
        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        aria-label="Open Gate"
      />
      <span class="text-sm">Open Gate</span>
    </label>

    <div class="mt-4 flex gap-2">
      <button
        class="px-3 py-1 bg-gray-200 rounded"
        onclick={() => userLink.goBack()}>Back</button
      >
      <button
        class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!openGate}
        onclick={() => userLink.goNext()}
      >
        Open Gate / Next
      </button>
    </div>
  </div>
</div>
