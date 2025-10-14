<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { LinkStore } from "../../state/linkStore.svelte";
  import { LinkStep } from "../../types/linkStep";
  import { resolve } from "$app/paths";
  import LinkDetails from "./linkDetails.svelte";
  import { actionDrawerState } from "$modules/shared/state/actionDrawerState.svelte";

  const {
    link,
  }: {
    link: LinkStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  // Redirect if not in the correct step
  $effect(() => {
    if (link.state.step !== LinkStep.CREATED) {
      goto(resolve("/"));
    }
  });

  // Navigate back to the previous step
  async function goBack() {
    goto(resolve("/"));
  }

  // Create the link
  async function create() {
    alert("WIP execute action " + link.id);
  }

  // Show action details in drawer
  function showActionDetails() {
    if (link.action) {
      actionDrawerState.open(link.action);
    }
  }
</script>

<h3 class="text-lg font-semibold">Created</h3>
<div class="mt-2">
  <LinkDetails {link} {errorMessage} {successMessage} />

  <div class="flex gap-2 mt-4">
    <Button onclick={goBack}>Back</Button>
    <Button onclick={create}>Create</Button>

    {#if link.action}
      <Button variant="outline" onclick={showActionDetails}>
        View Action Details
      </Button>
    {/if}
  </div>
</div>
