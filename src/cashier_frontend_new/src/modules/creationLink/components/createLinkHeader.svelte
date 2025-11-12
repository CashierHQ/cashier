<script lang="ts">
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  // Accept a link store instance. We type as `any` to avoid tightly coupling to store internals here.
  // The pages pass a LinkStore instance (newLink).
  export let link: LinkCreationStore;
</script>

<nav class="flex gap-2">
  <button
    class="px-3 py-1 rounded"
    class:font-semibold={link?.state?.step === LinkStep.CHOOSE_TYPE}
    aria-pressed={link?.state?.step === LinkStep.CHOOSE_TYPE}
  >
    Choose Type
  </button>
  <button
    class="px-3 py-1 rounded"
    class:font-semibold={link?.state?.step === LinkStep.ADD_ASSET}
    aria-pressed={link?.state?.step === LinkStep.ADD_ASSET}
  >
    Asset
  </button>
  <button
    class="px-3 py-1 rounded"
    class:font-semibold={link?.state?.step === LinkStep.PREVIEW ||
      link?.state?.step === LinkStep.CREATED}
    aria-pressed={link?.state?.step === LinkStep.PREVIEW ||
      link?.state?.step === LinkStep.CREATED}
  >
    Preview
  </button>
</nav>
