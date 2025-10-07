<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { LinkStore } from "../../states/linkStore.svelte";
  import { LinkStep } from "../../types/linkStep";
  import { resolve } from "$app/paths";
  import LinkDetails from "./linkDetails.svelte";

  const {
    link,
  }: {
    link: LinkStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  // Redirect if not in the correct step
  $effect(() => {
    if (link.state.step !== LinkStep.PREVIEW) {
      goto(resolve("/"));
    }
  });

  // Navigate back to the previous step
  async function goBack() {
    try {
      await link.goBack();
    } catch (error) {
      console.error("Failed to go back: ", error);
    }
  }

  // Create the link
  async function create() {
    errorMessage = null;
    successMessage = null;
    try {
      await link.goNext();
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

  <Button onclick={goBack}>Back</Button>

  <Button onclick={create}>Create</Button>
</div>
