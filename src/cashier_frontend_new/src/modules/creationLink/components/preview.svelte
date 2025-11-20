<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { linkListStore } from "$modules/links/state/linkListStore.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import LinkDetails from "./linkDetails.svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  // Create the link
  async function handleCreate() {
    errorMessage = null;
    successMessage = null;
    try {
      await link.goNext();
      linkListStore.refresh();
      successMessage = "Link created successfully: " + link.id;
    } catch (error) {
      errorMessage = "Failed to create link: " + error;
      return;
    }
  }
</script>

<h3 class="text-lg font-semibold">Preview</h3>
<div class="mt-2">
  <LinkDetails {link} {errorMessage} {successMessage} />

  <Button onclick={handleCreate}>Create</Button>
</div>
