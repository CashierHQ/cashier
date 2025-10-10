<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { LinkStore } from "../../state/linkStore.svelte";
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
</script>

<h3 class="text-lg font-semibold">Created</h3>
<div class="mt-2">
  <LinkDetails {link} {errorMessage} {successMessage} />

  <Button onclick={goBack}>Back</Button>

  <Button onclick={create}>Create</Button>
</div>

{#if link.action}
  <div class="mt-4 p-4 border rounded bg-gray-50">
    <h4 class="font-semibold mb-2">Action Details</h4>
    <pre class="whitespace-pre-wrap break-all">{link.action.id}</pre>

    {#each link.action.intents as intent}
      <div class="mt-2 p-2 border rounded bg-white">
        <h5 class="font-semibold">Intent: {intent.id}</h5>
        <h5 class="font-semibold">Task: {intent.task.id}</h5>
        <h5 class="font-semibold">Status: {intent.state.id}</h5>
      </div>
    {/each}
  </div>
{/if}
